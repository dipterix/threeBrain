#!/usr/bin/env node
// threebrain-hub: lets other programs drive threeBrain 3D viewers through a
// WebSocket on this computer
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { createHub } from './hub.js';
import { connectController } from './client.js';
import { startMcpServer } from './mcp.js';
import { findHubs, hubDirectory, removeRecord, writeRecord } from './registry.js';
import { DEFAULT_PORT, formatPasskey, generateKey, isValidKey } from './passkey.js';
import { VERSION } from './version.js';

const HELP = `threebrain-hub ${VERSION}
Lets other programs (R, Python, AI agents) drive threeBrain 3D viewers through
a WebSocket on this computer (127.0.0.1 only).

Usage:
  threebrain-hub serve [--port ${DEFAULT_PORT}] [--key KEY | --generate-key]
                       [--idle-minutes 30] [--detach] [--by NAME]
  threebrain-hub stop  [--port ${DEFAULT_PORT}] [--key KEY]
  threebrain-hub list  [--json] [--port ${DEFAULT_PORT}]
  threebrain-hub mcp   [--port ${DEFAULT_PORT}]
  threebrain-hub --help | --version

serve   Start the hub. It prints a passkey: "${DEFAULT_PORT}", or "${DEFAULT_PORT}.KEY"
        with a key. In the viewer, open "Remote Control", enter the passkey and
        click Connect. Without a key, any program or web page on this computer
        can connect; use --key or --generate-key when that matters.
        --detach runs the hub in the background and returns once it listens.
        The hub exits after --idle-minutes with nothing connected (0: never).
        Running hubs are recorded in ${hubDirectory()}
        (THREEBRAIN_HUB_DIR sets another folder); --by says who started it.
stop    Stop the hub on --port.
list    The hubs running on this computer, with their passkeys.
mcp     MCP server (stdio) for AI agents, e.g.
          claude mcp add threebrain -- node threebrain-hub.mjs mcp
        Agents join a running hub, or start one on --port.
`;

const OPTIONS = {
  port: { type: 'string' },
  key: { type: 'string' },
  'generate-key': { type: 'boolean' },
  'idle-minutes': { type: 'string' },
  detach: { type: 'boolean' },
  by: { type: 'string' },
  json: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
};

function fail(message) {
  process.stderr.write(`threebrain-hub: ${message}\n`);
  process.exit(1);
}

function readOptions(values) {
  const port = values.port === undefined ? DEFAULT_PORT : Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) { fail(`invalid --port "${values.port}"`); }
  let key = values.key ?? null;
  if (key !== null && !isValidKey(key)) { fail('a key may contain letters, digits, "_" and "-" only'); }
  if (values['generate-key']) { key = generateKey(); }
  const idleMinutes = values['idle-minutes'] === undefined ? 30 : Number(values['idle-minutes']);
  if (!(idleMinutes >= 0)) { fail(`invalid --idle-minutes "${values['idle-minutes']}"`); }
  return { port, key, idleMinutes };
}

async function isListening(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
    await response.text();
    return true;
  } catch (e) {
    return false;
  }
}

async function serve(values) {
  const { port, key, idleMinutes } = readOptions(values);
  const passkey = formatPasskey({ port, key });

  if (values.detach) {
    if (await isListening(port)) { fail(`127.0.0.1:${port} is already in use (a hub already running?)`); }
    const args = [process.argv[1], 'serve', '--port', String(port), '--idle-minutes', String(idleMinutes)];
    if (key) { args.push('--key', key); }
    if (values.by) { args.push('--by', values.by); }
    spawn(process.execPath, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    for (let waited = 0; waited < 5000; waited += 100) {
      if (await isListening(port)) {
        process.stdout.write(`threeBrain hub running on 127.0.0.1:${port} (passkey: ${passkey})\n`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    fail(`the hub did not start on 127.0.0.1:${port}`);
  }

  const hub = createHub({ port, key, idleMinutes });
  try {
    await hub.start();
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      fail(`127.0.0.1:${port} is already in use (a hub already running?)`);
    }
    fail(error.message);
  }
  // announce the hub so that R and agents can find it, until it stops
  const record = { port, by: values.by ?? '', version: VERSION };
  writeRecord({ ...record, key });
  hub.on('key', (next) => writeRecord({ ...record, key: next }));
  process.on('exit', () => removeRecord(port));
  process.stdout.write(`threeBrain hub listening on 127.0.0.1:${port} (passkey: ${passkey})\n`);

  const quit = () => hub.stop().then(() => process.exit(0));
  hub.on('shutdown', () => process.exit(0));
  hub.on('idle', () => {
    process.stdout.write(`Nothing connected for ${idleMinutes} minutes; stopping.\n`);
    quit();
  });
  process.on('SIGINT', quit);
  process.on('SIGTERM', quit);
}

async function list(values) {
  const { port } = readOptions({ ...values, 'generate-key': false });
  const hubs = await findHubs({ ports: [port] });
  if (values.json) {
    process.stdout.write(`${JSON.stringify(hubs, null, 2)}\n`);
    return;
  }
  if (hubs.length === 0) {
    process.stdout.write('No hub is running.\n');
    return;
  }
  for (const hub of hubs) {
    const who = hub.by ? `, started by ${hub.by}` : '';
    const passkey = hub.passkey ?? `${hub.port}.<key unknown>`;
    process.stdout.write(`127.0.0.1:${hub.port}  passkey ${passkey}  ${hub.viewers} viewer(s)${who}\n`);
  }
}

async function stop(values) {
  const { port } = readOptions({ ...values, 'generate-key': false });
  let { key } = readOptions({ ...values, 'generate-key': false });
  // a keyed hub's key is in its record
  if (key === null) {
    key = (await findHubs({ ports: [port] })).find((hub) => hub.port === port)?.key ?? null;
  }
  let client;
  try {
    client = await connectController({ port, key, name: 'threebrain-hub stop', spawn: false });
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      process.stdout.write(`No hub is running on 127.0.0.1:${port}.\n`);
      return;
    }
    fail(error.message);
  }
  await client.request({ type: 'hub', op: 'shutdown' });
  client.close();
  process.stdout.write(`Stopped the hub on 127.0.0.1:${port}.\n`);
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({ args: process.argv.slice(2), options: OPTIONS, allowPositionals: true });
  } catch (error) {
    fail(`${error.message}\n\n${HELP}`);
  }
  const { values, positionals } = parsed;
  if (values.version) { process.stdout.write(`${VERSION}\n`); return; }
  const command = positionals[0];
  if (values.help || !command) { process.stdout.write(HELP); return; }
  switch (command) {
    case 'serve': return serve(values);
    case 'stop': return stop(values);
    case 'list': return list(values);
    case 'mcp': {
      const { port, key } = readOptions({ ...values, 'generate-key': false });
      return startMcpServer({ port, key });
    }
    default: fail(`unknown command "${command}"\n\n${HELP}`);
  }
}

main();
