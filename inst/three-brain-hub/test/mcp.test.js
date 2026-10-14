import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
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

// An MCP session over stdio, the way an agent host runs the server
function mcpSession(t, args) {
  const child = spawn(process.execPath, [ ENTRY, 'mcp', ...args ], { stdio: [ 'pipe', 'pipe', 'pipe' ] });
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
async function fakeViewer(t, port, { title = 'N27 page', key, answer } = {}) {
  const viewer = openClient(port, viewerHello({ ...(key ? { key } : {}), viewer: { title, subjects: [ 'N27' ], container_id: 'w1' } }));
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
  assert.deepEqual(names, [ 'capture_screenshot', 'describe_commands', 'get_events', 'get_passkey',
    'get_state', 'hub_status', 'list_viewers', 'run_command' ]);
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

test('with no hub running, the first tool call starts one', async (t) => {
  const port = await freePort();
  const { tool } = mcpSession(t, [ '--port', String(port) ]);
  const result = await tool('hub_status');
  assert.ok(!result.isError, text(result));
  const client = await connectController({ port, spawn: false });
  await client.request({ type: 'hub', op: 'shutdown' });
  client.close();
});

test('an unknown tool is a JSON-RPC error', async (t) => {
  const hub = await startHub(t);
  const { call } = mcpSession(t, [ '--port', String(hub.port) ]);
  const response = await call('tools/call', { name: 'nope', arguments: {} });
  assert.ok(response.error, JSON.stringify(response));
});
