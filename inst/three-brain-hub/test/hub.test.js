import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { WebSocket as WsWebSocket } from 'ws';
import { createHub } from '../src/hub.js';
import { freePort, openClient, viewerHello, controllerHello, isType, sleep } from './helpers.js';

async function startHub(t, options = {}) {
  const port = await freePort();
  const hub = createHub({ port, ...options });
  await hub.start();
  t.after(() => hub.stop());
  return hub;
}

async function joined(t, port, hello) {
  const client = openClient(port, hello);
  t.after(() => client.close());
  await client.opened;
  const welcome = await client.next(isType('welcome'));
  return { client, welcome };
}

test('open hub welcomes viewers and controllers with their own ids', async (t) => {
  const hub = await startHub(t);
  const { welcome: v } = await joined(t, hub.port, viewerHello());
  const { welcome: c } = await joined(t, hub.port, controllerHello());
  assert.equal(v.protocol, 1);
  assert.match(v.id, /^v\d+$/);
  assert.match(c.id, /^c\d+$/);
  assert.equal(v.hub.port, hub.port);
  assert.equal(v.hub.keyed, false);
});

test('a keyed hub closes clients with a missing or wrong key (4401) and welcomes the right one', async (t) => {
  const hub = await startHub(t, { key: 'secret1' });
  for (const hello of [viewerHello(), viewerHello({ key: 'nope' }), controllerHello(), controllerHello({ key: 'nope' })]) {
    const client = openClient(hub.port, hello);
    await client.opened;
    const { code } = await client.closed();
    assert.equal(code, 4401, `role ${hello.role} key ${hello.key}`);
  }
  const { welcome } = await joined(t, hub.port, viewerHello({ key: 'secret1' }));
  assert.equal(welcome.hub.keyed, true);
  await joined(t, hub.port, controllerHello({ key: 'secret1' }));
});

test('a hello with another protocol version or role is closed with 4400', async (t) => {
  const hub = await startHub(t);
  for (const hello of [viewerHello({ protocol: 2 }), { type: 'hello', protocol: 1, role: 'admin' }, { type: 'command' }]) {
    const client = openClient(hub.port, hello);
    await client.opened;
    assert.equal((await client.closed()).code, 4400);
  }
});

test('commands reach the viewer under a hub id and results come back under the controller id', async (t) => {
  const hub = await startHub(t);
  const { client: viewer, welcome: v } = await joined(t, hub.port, viewerHello());
  const { client: controller } = await joined(t, hub.port, controllerHello());

  controller.send({ type: 'command', id: 'r1', target: v.id, name: 'background', value: '#000000' });
  const forwarded = await viewer.next(isType('command'));
  assert.equal(forwarded.name, 'background');
  assert.equal(forwarded.value, '#000000');
  assert.notEqual(forwarded.id, 'r1');

  viewer.send({ type: 'result', id: forwarded.id, ok: true, value: 'done' });
  const result = await controller.next(isType('result'));
  assert.deepEqual(result, { type: 'result', id: 'r1', ok: true, value: 'done' });
});

test('two controllers may reuse the same request id without crossing replies', async (t) => {
  const hub = await startHub(t);
  const { client: viewer, welcome: v } = await joined(t, hub.port, viewerHello());
  const { client: a } = await joined(t, hub.port, controllerHello({ name: 'a' }));
  const { client: b } = await joined(t, hub.port, controllerHello({ name: 'b' }));

  a.send({ type: 'command', id: 'same', target: v.id, name: 'title', value: 'A' });
  b.send({ type: 'command', id: 'same', target: v.id, name: 'title', value: 'B' });
  const first = await viewer.next(isType('command'));
  const second = await viewer.next(isType('command'));
  // answer in reverse order on purpose
  viewer.send({ type: 'result', id: second.id, ok: true, value: second.value });
  viewer.send({ type: 'result', id: first.id, ok: true, value: first.value });

  assert.equal((await a.next(isType('result'))).value, 'A');
  assert.equal((await b.next(isType('result'))).value, 'B');
});

test('a viewer that leaves fails its pending requests with viewer_left', async (t) => {
  const hub = await startHub(t);
  const { client: viewer, welcome: v } = await joined(t, hub.port, viewerHello());
  const { client: controller } = await joined(t, hub.port, controllerHello());
  controller.send({ type: 'command', id: 'r9', target: v.id, name: 'capture', value: {} });
  await viewer.next(isType('command'));
  viewer.close();
  const result = await controller.next(isType('result'));
  assert.equal(result.id, 'r9');
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'viewer_left');
});

test('a command for a viewer that does not exist fails with unknown_viewer', async (t) => {
  const hub = await startHub(t);
  const { client: controller } = await joined(t, hub.port, controllerHello());
  controller.send({ type: 'command', id: 'x', target: 'v99', name: 'title', value: '' });
  const result = await controller.next(isType('result'));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'unknown_viewer');
});

test('a viewer that never answers yields a timeout error', async (t) => {
  const hub = await startHub(t, { requestTimeoutMs: 150 });
  const { welcome: v } = await joined(t, hub.port, viewerHello());
  const { client: controller } = await joined(t, hub.port, controllerHello());
  controller.send({ type: 'command', id: 't', target: v.id, name: 'title', value: '' });
  const result = await controller.next(isType('result'));
  assert.equal(result.error.code, 'timeout');
});

test('list answers with the connected viewers, including their page origin', async (t) => {
  const hub = await startHub(t);
  const viewer = openClient(hub.port, viewerHello(), {
    WebSocketClass: WsWebSocket, options: { origin: 'http://127.0.0.1:8000' },
  });
  t.after(() => viewer.close());
  await viewer.opened;
  const { id } = await viewer.next(isType('welcome'));
  const { client: controller } = await joined(t, hub.port, controllerHello());

  controller.send({ type: 'list', id: 'l1' });
  const result = await controller.next(isType('result'));
  assert.equal(result.id, 'l1');
  assert.equal(result.ok, true);
  assert.equal(result.value.length, 1);
  assert.equal(result.value[0].id, id);
  assert.equal(result.value[0].title, 'N27');
  assert.deepEqual(result.value[0].subjects, ['N27']);
  assert.equal(result.value[0].origin, 'http://127.0.0.1:8000');
});

test('controllers hear viewers join and leave', async (t) => {
  const hub = await startHub(t);
  const { client: controller } = await joined(t, hub.port, controllerHello());
  const { client: viewer, welcome: v } = await joined(t, hub.port, viewerHello());
  const joinedNote = await controller.next(isType('viewer_joined'));
  assert.equal(joinedNote.viewer.id, v.id);
  viewer.close();
  const leftNote = await controller.next(isType('viewer_left'));
  assert.equal(leftNote.viewer.id, v.id);
});

test('subscribed controllers receive only the events they asked for', async (t) => {
  const hub = await startHub(t);
  const { client: viewer, welcome: v } = await joined(t, hub.port, viewerHello());
  const { client: controller } = await joined(t, hub.port, controllerHello());
  controller.send({ type: 'subscribe', id: 's1', targets: '*', names: ['mouse_clicked'] });
  assert.equal((await controller.next(isType('result'))).ok, true);

  viewer.send({ type: 'event', name: 'controllers', value: { a: 1 } });
  viewer.send({ type: 'event', name: 'mouse_clicked', value: { name: 'e1' } });
  const event = await controller.next(isType('event'));
  assert.equal(event.name, 'mouse_clicked');
  assert.equal(event.source, v.id);
  assert.deepEqual(event.value, { name: 'e1' });
  assert.equal(typeof event.time, 'number');
  await sleep(100);
  assert.equal(controller.inbox.filter(isType('event')).length, 0);
});

test('the hub keeps the last 50 events per viewer for the events op', async (t) => {
  const hub = await startHub(t);
  const { client: viewer, welcome: v } = await joined(t, hub.port, viewerHello());
  const { client: controller } = await joined(t, hub.port, controllerHello());
  for (let i = 0; i < 60; i++) {
    viewer.send({ type: 'event', name: 'controllers', value: { i } });
  }
  await sleep(150);
  controller.send({ type: 'hub', op: 'events', id: 'e', target: v.id });
  const { value } = await controller.next(isType('result'));
  assert.equal(value.length, 50);
  assert.deepEqual(value.at(-1).value, { i: 59 });
  assert.equal(value.at(-1).source, v.id);
});

test('status reports the port, key mode and client counts', async (t) => {
  const hub = await startHub(t);
  await joined(t, hub.port, viewerHello());
  const { client: controller } = await joined(t, hub.port, controllerHello());
  controller.send({ type: 'hub', op: 'status', id: 's' });
  const { value } = await controller.next(isType('result'));
  assert.equal(value.port, hub.port);
  assert.equal(value.keyed, false);
  assert.equal(value.viewers, 1);
  assert.equal(value.controllers, 1);
});

test('set_key changes the passkey for new clients and keeps connected ones', async (t) => {
  const hub = await startHub(t);
  const { client: controller } = await joined(t, hub.port, controllerHello());
  controller.send({ type: 'hub', op: 'set_key', id: 'k', key: 'abc123' });
  const { value } = await controller.next(isType('result'));
  assert.equal(value.passkey, `${hub.port}.abc123`);

  const refused = openClient(hub.port, viewerHello());
  await refused.opened;
  assert.equal((await refused.closed()).code, 4401);
  await joined(t, hub.port, viewerHello({ key: 'abc123' }));

  controller.send({ type: 'hub', op: 'status', id: 's2' });
  assert.equal((await controller.next(isType('result'))).value.keyed, true);
});

test('viewers report whether they are visible; list shows it and since when', async (t) => {
  const hub = await startHub(t);
  const { client: viewer, welcome: v } = await joined(t, hub.port,
    viewerHello({ viewer: { title: 'N27', subjects: [ 'N27' ], visible: true } }));
  const { client: controller } = await joined(t, hub.port, controllerHello());
  controller.send({ type: 'list', id: 'l1' });
  let [ entry ] = (await controller.next(isType('result'))).value;
  assert.equal(entry.visible, true);
  const before = entry.visibility_since;
  assert.equal(typeof before, 'number');

  await sleep(20);
  viewer.send({ type: 'event', name: 'visibility', value: { visible: false } });
  await sleep(100);
  controller.send({ type: 'list', id: 'l2' });
  [ entry ] = (await controller.next(isType('result'))).value;
  assert.equal(entry.id, v.id);
  assert.equal(entry.visible, false);
  assert.ok(entry.visibility_since > before);
});

test('a viewer that does not report visibility is listed as unknown', async (t) => {
  const hub = await startHub(t);
  await joined(t, hub.port, viewerHello());
  const { client: controller } = await joined(t, hub.port, controllerHello());
  controller.send({ type: 'list', id: 'l' });
  const [ entry ] = (await controller.next(isType('result'))).value;
  assert.equal(entry.visible, null);
});

test('the disconnect op closes one viewer with 4001 and controllers hear it leave', async (t) => {
  const hub = await startHub(t);
  const { client: viewer, welcome: v } = await joined(t, hub.port, viewerHello());
  const { client: other } = await joined(t, hub.port, viewerHello());
  const { client: controller } = await joined(t, hub.port, controllerHello());
  controller.send({ type: 'hub', op: 'disconnect', id: 'd', target: v.id });
  assert.equal((await controller.next(isType('result'))).ok, true);
  assert.equal((await viewer.closed()).code, 4001);
  assert.equal((await controller.next(isType('viewer_left'))).viewer.id, v.id);
  controller.send({ type: 'list', id: 'l' });
  assert.equal((await controller.next(isType('result'))).value.length, 1);
  other.close();
});

test('disconnecting a viewer that is not connected fails with unknown_viewer', async (t) => {
  const hub = await startHub(t);
  const { client: controller } = await joined(t, hub.port, controllerHello());
  controller.send({ type: 'hub', op: 'disconnect', id: 'd', target: 'v42' });
  const result = await controller.next(isType('result'));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'unknown_viewer');
});

test('an idle hub announces it once nobody has been connected for the idle time', async (t) => {
  const hub = await startHub(t, { idleMinutes: 0.003 }); // 180 ms
  let idle = 0;
  hub.on('idle', () => { idle += 1; });
  const { client } = await joined(t, hub.port, controllerHello());
  await sleep(400);
  assert.equal(idle, 0, 'went idle while a client was connected');
  client.close();
  await sleep(500);
  assert.equal(idle, 1);
});

test('a hub stopped while clients are connected never re-arms its idle timer', async (t) => {
  const port = await freePort();
  const hub = createHub({ port, idleMinutes: 0.003 }); // 180 ms
  await hub.start();
  let idle = 0;
  hub.on('idle', () => { idle += 1; });
  const client = openClient(port, controllerHello());
  await client.opened;
  await client.next(isType('welcome'));
  await hub.stop();
  await client.closed();
  await sleep(400);
  assert.equal(idle, 0, 'a stopped hub scheduled an idle timer (it would keep the process alive)');
});

test('the hub listens on 127.0.0.1 only', async (t) => {
  const hub = await startHub(t);
  assert.equal(hub.host, '127.0.0.1');
  const lan = Object.values(os.networkInterfaces()).flat()
    .find((nic) => nic && nic.family === 'IPv4' && !nic.internal);
  if (!lan) { t.skip('no LAN address on this machine'); return; }
  const client = openClient(hub.port, viewerHello(), { host: lan.address });
  await assert.rejects(client.opened);
});

test('a second hub on a busy port fails with EADDRINUSE', async (t) => {
  const hub = await startHub(t);
  const second = createHub({ port: hub.port });
  await assert.rejects(second.start(), { code: 'EADDRINUSE' });
});
