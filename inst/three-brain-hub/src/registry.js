// Running hubs announce themselves with one small file each, hub-<port>.json,
// in tools::R_user_dir("threeBrain", "cache")/hubs (or $THREEBRAIN_HUB_DIR),
// so that R, agents and other programs can find and join them.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_PORT, formatPasskey } from './passkey.js';

// tools::R_user_dir("threeBrain", "cache"), plus "hubs". An empty variable
// counts as unset, as in R.
export function hubDirectory() {
  const env = (name) => process.env[name] || '';
  if (env('THREEBRAIN_HUB_DIR')) { return env('THREEBRAIN_HUB_DIR'); }
  let base = env('R_USER_CACHE_DIR') || env('XDG_CACHE_HOME');
  if (!base) {
    if (process.platform === 'win32') {
      base = path.join(env('LOCALAPPDATA'), 'R', 'cache');
    } else if (process.platform === 'darwin') {
      base = path.join(os.homedir(), 'Library', 'Caches', 'org.R-project.R');
    } else {
      base = path.join(os.homedir(), '.cache');
    }
  }
  return path.join(base, 'R', 'threeBrain', 'hubs');
}

const recordFile = (dir, port) => path.join(dir, `hub-${port}.json`);

export function writeRecord({ port, key = null, by = '', version = '' }, dir = hubDirectory()) {
  fs.mkdirSync(dir, { recursive: true });
  const record = { port, key, pid: process.pid, started: Date.now(), by, version };
  fs.writeFileSync(recordFile(dir, port), JSON.stringify(record, null, 2));
  return record;
}

// removes the record of `port` if this process wrote it
export function removeRecord(port, dir = hubDirectory()) {
  const file = recordFile(dir, port);
  try {
    const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (record.pid === process.pid) { fs.unlinkSync(file); }
  } catch (e) {}
}

// The hub's own description, or 'refused' when nothing listens on the port,
// or null when something else (or nothing in time) answers
async function probe(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/status`, { signal: AbortSignal.timeout(1000) });
    const status = await response.json();
    return status && status.name === 'threeBrain hub' && status.port === port ? status : null;
  } catch (error) {
    return error?.cause?.code === 'ECONNREFUSED' ? 'refused' : null;
  }
}

/**
 * The hubs running on this computer, by port: those with a record, and any
 * answering on `ports` (a hub started without a record). Records whose port
 * refuses connections belong to hubs that are gone and are deleted.
 */
export async function findHubs({ ports = [ DEFAULT_PORT ], dir = hubDirectory() } = {}) {
  const found = new Map();
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((name) => /^hub-\d+\.json$/.test(name));
  } catch (e) {}
  for (const name of files) {
    const file = path.join(dir, name);
    let record;
    try {
      record = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      continue;
    }
    const status = await probe(record.port);
    if (status === 'refused') {
      try { fs.unlinkSync(file); } catch (e) {}
      continue;
    }
    if (!status) { continue; }
    found.set(record.port, describe(status, record));
  }
  for (const port of ports) {
    if (found.has(port)) { continue; }
    const status = await probe(port);
    if (status && status !== 'refused') { found.set(port, describe(status, null)); }
  }
  return [ ...found.values() ].sort((a, b) => a.port - b.port);
}

function describe(status, record) {
  const key = record?.key ?? null;
  return {
    port: status.port,
    keyed: status.keyed,
    // without a record the key of a keyed hub is unknown
    key,
    passkey: status.keyed && !key ? null : formatPasskey({ port: status.port, key }),
    viewers: status.viewers,
    controllers: status.controllers,
    version: status.version,
    by: record?.by ?? '',
    started: record?.started ?? null,
    pid: record?.pid ?? null,
    record: !!record,
  };
}
