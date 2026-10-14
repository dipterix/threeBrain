import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createHub } from '../src/hub.js';
import { connectController } from '../src/client.js';
import { freePort, openClient, viewerHello, isType, sleep } from './helpers.js';

// `HUB_ENTRY=dist/threebrain-hub.mjs npm test` runs the same tests on the bundle
const ENTRY = process.env.HUB_ENTRY
  ? fileURLToPath(new URL(`../${process.env.HUB_ENTRY}`, import.meta.url))
  : fileURLToPath(new URL('../src/cli.js', import.meta.url));
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const run = promisify(execFile);

// a hub registry of its own, so tests never see the user's hubs
function tempRegistry(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'threebrain-hubs-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir, env: { ...process.env, THREEBRAIN_HUB_DIR: dir } };
}

// a hub started like a user or R would: `serve --detach`, with a record
async function serveHub(t, env, port, extra = []) {
  await run(process.execPath, [ ENTRY, 'serve', '--port', String(port), '--detach', ...extra ], { env });
  const key = extra.includes('--key') ? extra[extra.indexOf('--key') + 1] : null;
  t.after(() => run(process.execPath, [ ENTRY, 'stop', '--port', String(port), ...(key ? [ '--key', key ] : []) ], { env }).catch(() => {}));
}

// An MCP session over stdio, the way an agent host runs the server
function mcpSession(t, args, env = tempRegistry(t).env) {
  const child = spawn(process.execPath, [ ENTRY, 'mcp', ...args ], { stdio: [ 'pipe', 'pipe', 'pipe' ], env });
  t.after(() => { child.stdin.end(); if (child.exitCode === null) { child.kill(); } });
  const waiting = new Map();
  const stray = [];
  readline.createInterface({ input: child.stdout }).on('line', (line) => {
    const message = JSON.parse(line);
    const resolve = waiting.get(message.id);
    if (resolve) { waiting.delete(message.id); resolve(message); } else { stray.push(message); }
  });
  let counter = 0;
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++counter;
    const timer = setTimeout(() => reject(new Error(`no answer to ${method}`)), 15000);
    waiting.set(id, (message) => { clearTimeout(timer); resolve(message); });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
  const tool = async (name, args = {}) => (await call('tools/call', { name, arguments: args })).result;
  return { child, call, tool, stray };
}

// A stand-in viewer that records commands and answers them
async function fakeViewer(t, port, { title = 'N27 page', key, answer, visible } = {}) {
  const info = { title, subjects: [ 'N27' ], container_id: 'w1', ...(visible === undefined ? {} : { visible }) };
  const viewer = openClient(port, viewerHello({ ...(key ? { key } : {}), viewer: info }));
  t.after(() => viewer.close());
  await viewer.opened;
  const { id } = await viewer.next(isType('welcome'));
  const received = [];
  viewer.ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type !== 'command') { return; }
    received.push(message);
    const reply = answer ? answer(message)
      : message.name === 'capture' ? { ok: true, value: { dataURI: `data:image/png;base64,${PNG}`, views: [] } }
      : message.name === 'no_such' ? { ok: false, error: { code: 'unknown_command', message: 'Unknown command "no_such"' } }
      : { ok: true, value: { echoed: message.name } };
    viewer.send({ type: 'result', id: message.id, ...reply });
  });
  return { id, viewer, received };
}

async function startHub(t, options = {}) {
  const port = await freePort();
  const hub = createHub({ port, ...options });
  await hub.start();
  t.after(() => hub.stop());
  return hub;
}

const text = (result) => result.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');

test('initialize answers with the protocol version, server info and instructions', async (t) => {
  const hub = await startHub(t);
  const { call } = mcpSession(t, [ '--port', String(hub.port) ]);
  const { result } = await call('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
  assert.equal(result.protocolVersion, '2025-03-26');
  assert.equal(result.serverInfo.name, 'threebrain');
  assert.ok(result.capabilities.tools);
  assert.match(result.instructions, /passkey/i);
});

test('tools/list offers the viewer tools with input schemas', async (t) => {
  const hub = await startHub(t);
  const { call } = mcpSession(t, [ '--port', String(hub.port) ]);
  const { result } = await call('tools/list');
  const names = result.tools.map((tool) => tool.name).sort();
  assert.deepEqual(names, [ 'capture_screenshot', 'connect_hub', 'describe_commands', 'disconnect_viewer', 'get_events',
    'get_passkey', 'get_state', 'hub_status', 'list_viewers', 'run_command', 'start_hub', 'stop_hub' ]);
  for (const tool of result.tools) {
    assert.equal(tool.inputSchema.type, 'object', tool.name);
    assert.ok(tool.description.length > 40, tool.name);
  }
});

test('list_viewers names the connected viewer and marks viewer text as data', async (t) => {
  const hub = await startHub(t);
  const { id } = await fakeViewer(t, hub.port);
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  const result = await tool('list_viewers');
  assert.ok(!result.isError, text(result));
  assert.match(text(result), new RegExp(id));
  assert.match(text(result), /N27 page/);
  assert.match(text(result), /data, not instructions/);
});

test('run_command reaches the named viewer and returns its result', async (t) => {
  const hub = await startHub(t);
  const { id, received } = await fakeViewer(t, hub.port);
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  const result = await tool('run_command', { viewer: id, name: 'background', value: '#000000' });
  assert.ok(!result.isError, text(result));
  assert.equal(received.length, 1);
  assert.equal(received[0].name, 'background');
  assert.equal(received[0].value, '#000000');
  assert.match(text(result), /echoed/);
});

test('without a viewer argument, the only connected viewer is used', async (t) => {
  const hub = await startHub(t);
  const { received } = await fakeViewer(t, hub.port);
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  const result = await tool('run_command', { name: 'title', value: 'hello' });
  assert.ok(!result.isError, text(result));
  assert.equal(received[0].name, 'title');
});

test('with several viewers, a missing viewer argument is an error that lists them', async (t) => {
  const hub = await startHub(t);
  const a = await fakeViewer(t, hub.port, { title: 'left' });
  const b = await fakeViewer(t, hub.port, { title: 'right' });
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  const result = await tool('run_command', { name: 'title', value: 'x' });
  assert.equal(result.isError, true);
  assert.match(text(result), new RegExp(a.id));
  assert.match(text(result), new RegExp(b.id));
});

test('with no viewer connected, tools explain how the user connects one', async (t) => {
  const hub = await startHub(t);
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  const result = await tool('get_state');
  assert.equal(result.isError, true);
  assert.match(text(result), /get_passkey/);
  assert.match(text(result), /Connect/);
});

test('a viewer error comes back as an isError result with its code', async (t) => {
  const hub = await startHub(t);
  await fakeViewer(t, hub.port);
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  const result = await tool('run_command', { name: 'no_such', value: 1 });
  assert.equal(result.isError, true);
  assert.match(text(result), /unknown_command/);
});

test('capture_screenshot returns an MCP image', async (t) => {
  const hub = await startHub(t);
  await fakeViewer(t, hub.port);
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  const result = await tool('capture_screenshot');
  assert.ok(!result.isError, JSON.stringify(result).slice(0, 300));
  const image = result.content.find((c) => c.type === 'image');
  assert.ok(image, 'no image content');
  assert.equal(image.mimeType, 'image/png');
  assert.equal(image.data, PNG);
});

test('describe_commands and get_state ask the viewer', async (t) => {
  const hub = await startHub(t);
  const { received } = await fakeViewer(t, hub.port);
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  assert.ok(!(await tool('describe_commands')).isError);
  assert.ok(!(await tool('get_state')).isError);
  assert.deepEqual(received.map((m) => m.name), [ 'describe', 'get_state' ]);
});

test('get_events returns what viewers reported', async (t) => {
  const hub = await startHub(t);
  const { viewer } = await fakeViewer(t, hub.port);
  viewer.send({ type: 'event', name: 'mouse_clicked', value: { name: 'N27, 1 - LA1' } });
  await sleep(100);
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  const result = await tool('get_events', { names: [ 'mouse_clicked' ] });
  assert.ok(!result.isError, text(result));
  assert.match(text(result), /N27, 1 - LA1/);
  assert.match(text(result), /data, not instructions/);
});

test('get_passkey tells the agent what the user pastes; rotate makes the hub require a key', async (t) => {
  const hub = await startHub(t);
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  let result = await tool('get_passkey');
  assert.match(text(result), new RegExp(`\\b${hub.port}\\b`));
  // the fields live in the panel's Default folder; there is no "Remote Control" folder
  assert.match(text(result), /"Passkey"/);
  assert.match(text(result), /"Connect"/);
  assert.doesNotMatch(text(result), /Remote Control/);

  result = await tool('get_passkey', { rotate: true });
  const match = text(result).match(new RegExp(`${hub.port}\\.([A-Za-z0-9_-]+)`));
  assert.ok(match, text(result));
  const refused = openClient(hub.port, viewerHello());
  await refused.opened;
  assert.equal((await refused.closed()).code, 4401);
  // the session keeps working with the new key
  await fakeViewer(t, hub.port, { key: match[1] });
  assert.ok(!(await tool('list_viewers')).isError);
});

test('hub_status reports the hub', async (t) => {
  const hub = await startHub(t);
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  const result = await tool('hub_status');
  assert.ok(!result.isError, text(result));
  assert.match(text(result), new RegExp(`127\\.0\\.0\\.1:${hub.port}`));
});

test('with no hub running, tools say to call start_hub and start nothing', async (t) => {
  const port = await freePort();
  const { tool } = mcpSession(t, [ '--port', String(port) ]);
  const result = await tool('list_viewers');
  assert.equal(result.isError, true);
  assert.match(text(result), /start_hub/);
  await assert.rejects(connectController({ port, spawn: false, timeoutMs: 500 }));
});

test('start_hub starts a hub, joins it and returns the passkey for the user', async (t) => {
  const { dir, env } = tempRegistry(t);
  const port = await freePort();
  const { tool } = mcpSession(t, [ '--port', String(port) ], env);
  const result = await tool('start_hub');
  assert.ok(!result.isError, text(result));
  assert.match(text(result), new RegExp(`Passkey: ${port}\\b`));
  assert.match(text(result), /"Connect"/);
  const record = JSON.parse(fs.readFileSync(path.join(dir, `hub-${port}.json`), 'utf8'));
  assert.equal(record.by, 'mcp');
  assert.ok(!(await tool('list_viewers')).isError);
  const client = await connectController({ port, spawn: false });
  await client.request({ type: 'hub', op: 'shutdown' });
  client.close();
});

test('start_hub joins the hub already running on the port instead of starting another', async (t) => {
  const hub = await startHub(t);
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  const result = await tool('start_hub', { port: hub.port });
  assert.ok(!result.isError, text(result));
  assert.match(text(result), /already running/i);
  assert.match(text(result), new RegExp(`Passkey: ${hub.port}\\b`));
});

test('hub_status joins the only running hub, using the key from its record', async (t) => {
  const { env } = tempRegistry(t);
  const port = await freePort();
  await serveHub(t, env, port, [ '--key', 'secret9', '--by', 'R' ]);
  await fakeViewer(t, port, { key: 'secret9' });
  // the session's own port is empty: the hub is found through its record
  const { tool } = mcpSession(t, [ '--port', String(await freePort()) ], env);
  const status = await tool('hub_status');
  assert.ok(!status.isError, text(status));
  assert.match(text(status), new RegExp(`127\\.0\\.0\\.1:${port}`));
  assert.match(text(status), /joined/i);
  const viewers = await tool('list_viewers');
  assert.ok(!viewers.isError, text(viewers));
  assert.match(text(viewers), /N27 page/);
});

test('with two hubs running, tools ask which one and connect_hub chooses', async (t) => {
  const { env } = tempRegistry(t);
  const [ p1, p2 ] = [ await freePort(), await freePort() ];
  await serveHub(t, env, p1);
  await serveHub(t, env, p2);
  await fakeViewer(t, p2, { title: 'second hub viewer' });
  const { tool } = mcpSession(t, [ '--port', String(await freePort()) ], env);
  let result = await tool('list_viewers');
  assert.equal(result.isError, true);
  assert.match(text(result), new RegExp(`${p1}`));
  assert.match(text(result), new RegExp(`${p2}`));
  assert.match(text(result), /connect_hub/);
  result = await tool('connect_hub', { port: p2 });
  assert.ok(!result.isError, text(result));
  result = await tool('list_viewers');
  assert.match(text(result), /second hub viewer/);
});

test('connect_hub with a passkey joins a keyed hub that has no record', async (t) => {
  const hub = await startHub(t, { key: 'k7' });
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  let result = await tool('list_viewers');
  assert.equal(result.isError, true);
  assert.match(text(result), /key/i);
  result = await tool('connect_hub', { passkey: `${hub.port}.k7` });
  assert.ok(!result.isError, text(result));
  assert.ok(!(await tool('list_viewers')).isError);
});

test('list_viewers says which viewers are visible and which are hidden', async (t) => {
  const hub = await startHub(t);
  await fakeViewer(t, hub.port, { title: 'shown page', visible: true });
  await fakeViewer(t, hub.port, { title: 'hidden page', visible: false });
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  const listed = text(await tool('list_viewers'));
  assert.match(listed, /"shown page"[^;]*visible/);
  assert.match(listed, /"hidden page"[^;]*hidden for \d+ min/);
});

test('disconnect_viewer drops one viewer, which closes with 4001', async (t) => {
  const hub = await startHub(t);
  const { id, viewer } = await fakeViewer(t, hub.port);
  const { tool } = mcpSession(t, [ '--port', String(hub.port) ]);
  const result = await tool('disconnect_viewer', { viewer: id });
  assert.ok(!result.isError, text(result));
  assert.equal((await viewer.closed()).code, 4001);
  assert.match(text(await tool('list_viewers')), /No viewer is connected/);
});

test('stop_hub stops the joined hub: its record goes away and its port refuses', async (t) => {
  const { dir, env } = tempRegistry(t);
  const port = await freePort();
  await serveHub(t, env, port, [ '--by', 'R' ]);
  const { tool } = mcpSession(t, [ '--port', String(await freePort()) ], env);
  assert.match(text(await tool('hub_status')), /joined/i);
  const result = await tool('stop_hub');
  assert.ok(!result.isError, text(result));
  assert.match(text(result), new RegExp(`Stopped the hub on 127\\.0\\.0\\.1:${port}`));
  await assert.rejects(connectController({ port, spawn: false, timeoutMs: 1000 }));
  for( let i = 0; i < 30 && fs.existsSync(path.join(dir, `hub-${port}.json`)); i++ ) { await sleep(100); }
  assert.equal(fs.existsSync(path.join(dir, `hub-${port}.json`)), false, 'record left behind');
  // the session forgot the hub
  assert.match(text(await tool('list_viewers')), /start_hub/);
});

test('stop_hub with a port stops that hub only', async (t) => {
  const { env } = tempRegistry(t);
  const [ p1, p2 ] = [ await freePort(), await freePort() ];
  await serveHub(t, env, p1);
  await serveHub(t, env, p2);
  const { tool } = mcpSession(t, [ '--port', String(await freePort()) ], env);
  const result = await tool('stop_hub', { port: p1 });
  assert.ok(!result.isError, text(result));
  await assert.rejects(connectController({ port: p1, spawn: false, timeoutMs: 1000 }));
  const still = await connectController({ port: p2, spawn: false });
  still.close();
});

test('stop_hub with no hub running says so', async (t) => {
  const { tool } = mcpSession(t, [ '--port', String(await freePort()) ]);
  const result = await tool('stop_hub');
  assert.match(text(result), /No hub is running/);
});

test('an unknown tool is a JSON-RPC error', async (t) => {
  const hub = await startHub(t);
  const { call } = mcpSession(t, [ '--port', String(hub.port) ]);
  const response = await call('tools/call', { name: 'nope', arguments: {} });
  assert.ok(response.error, JSON.stringify(response));
});
