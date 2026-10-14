import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createHub } from '../src/hub.js';
import { hubDirectory } from '../src/registry.js';
import { freePort } from './helpers.js';

// `HUB_ENTRY=dist/threebrain-hub.mjs npm test` runs the CLI tests on the bundle
const ENTRY = process.env.HUB_ENTRY
  ? fileURLToPath(new URL(`../${process.env.HUB_ENTRY}`, import.meta.url))
  : fileURLToPath(new URL('../src/cli.js', import.meta.url));
const run = promisify(execFile);

function tempRegistry(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'threebrain-hubs-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir, env: { ...process.env, THREEBRAIN_HUB_DIR: dir } };
}

const cli = (args, env) => run(process.execPath, [ ENTRY, ...args ], { env });
const listHubs = async (env, extra = []) => JSON.parse((await cli([ 'list', '--json', ...extra ], env)).stdout);

test('GET /status describes the hub', async (t) => {
  const port = await freePort();
  const hub = createHub({ port, key: 'k1' });
  await hub.start();
  t.after(() => hub.stop());
  const status = await (await fetch(`http://127.0.0.1:${port}/status`)).json();
  assert.equal(status.name, 'threeBrain hub');
  assert.equal(status.port, port);
  assert.equal(status.keyed, true);
  assert.equal(status.viewers, 0);
  assert.equal(typeof status.version, 'string');
  assert.equal('key' in status, false, 'the key must not be served over HTTP');
});

test('serve writes a record that stop removes', async (t) => {
  const { dir, env } = tempRegistry(t);
  const port = await freePort();
  await cli([ 'serve', '--port', String(port), '--generate-key', '--detach', '--by', 'test' ], env);
  const file = path.join(dir, `hub-${port}.json`);
  assert.ok(fs.existsSync(file), 'no record written');
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(record.port, port);
  assert.match(record.key, /^[A-Za-z0-9_-]{8,}$/);
  assert.equal(record.by, 'test');
  assert.equal(typeof record.pid, 'number');
  assert.equal(typeof record.started, 'number');

  await cli([ 'stop', '--port', String(port), '--key', record.key ], env);
  for( let i = 0; i < 30 && fs.existsSync(file); i++ ) { await new Promise((r) => setTimeout(r, 100)); }
  assert.equal(fs.existsSync(file), false, 'record left behind after stop');
});

test('list --json reports running hubs with their passkeys and drops dead records', async (t) => {
  const { dir, env } = tempRegistry(t);
  const port = await freePort();
  await cli([ 'serve', '--port', String(port), '--key', 'abc123', '--detach', '--by', 'R' ], env);
  t.after(() => cli([ 'stop', '--port', String(port), '--key', 'abc123' ], env).catch(() => {}));
  // a hub that crashed: its record stays, nothing listens on its port
  const deadPort = await freePort();
  const deadFile = path.join(dir, `hub-${deadPort}.json`);
  fs.writeFileSync(deadFile, JSON.stringify({ port: deadPort, key: null, pid: 999999, started: 1, by: 'gone' }));

  // --port: list probes 17285 by default, where the user may run a hub of their own
  const hubs = await listHubs(env, [ '--port', String(await freePort()) ]);
  assert.deepEqual(hubs.map((h) => h.port), [ port ]);
  assert.equal(hubs[0].passkey, `${port}.abc123`);
  assert.equal(hubs[0].keyed, true);
  assert.equal(hubs[0].by, 'R');
  assert.equal(hubs[0].viewers, 0);
  assert.equal(fs.existsSync(deadFile), false, 'dead record not removed');
});

test('list --json also finds a hub without a record on --port', async (t) => {
  const { env } = tempRegistry(t);
  const port = await freePort();
  const hub = createHub({ port });
  await hub.start();
  t.after(() => hub.stop());
  const hubs = await listHubs(env, [ '--port', String(port) ]);
  assert.equal(hubs.length, 1);
  assert.equal(hubs[0].port, port);
  assert.equal(hubs[0].record, false);
  assert.equal(hubs[0].passkey, String(port));
});

test('the record folder follows tools::R_user_dir("threeBrain", "cache")', () => {
  const saved = { ...process.env };
  try {
    process.env.THREEBRAIN_HUB_DIR = '/x/hubs';
    assert.equal(hubDirectory(), '/x/hubs');
    delete process.env.THREEBRAIN_HUB_DIR;
    process.env.R_USER_CACHE_DIR = '/c';
    assert.equal(hubDirectory(), path.join('/c', 'R', 'threeBrain', 'hubs'));
    delete process.env.R_USER_CACHE_DIR;
    process.env.XDG_CACHE_HOME = '/xdg';
    assert.equal(hubDirectory(), path.join('/xdg', 'R', 'threeBrain', 'hubs'));
    delete process.env.XDG_CACHE_HOME;
    const expected = process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Caches', 'org.R-project.R', 'R', 'threeBrain', 'hubs')
      : process.platform === 'win32'
        ? path.join(process.env.LOCALAPPDATA ?? '', 'R', 'cache', 'R', 'threeBrain', 'hubs')
        : path.join(os.homedir(), '.cache', 'R', 'threeBrain', 'hubs');
    assert.equal(hubDirectory(), expected);
  } finally {
    for( const name of [ 'THREEBRAIN_HUB_DIR', 'R_USER_CACHE_DIR', 'XDG_CACHE_HOME' ] ) {
      if( saved[name] === undefined ) { delete process.env[name]; } else { process.env[name] = saved[name]; }
    }
  }
});
