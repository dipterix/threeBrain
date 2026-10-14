import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { connectController } from '../src/client.js';
import { createHub } from '../src/hub.js';
import { freePort, openClient, viewerHello, isType } from './helpers.js';

const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url));

test('connecting to an empty port fails when spawning is off', async () => {
  const port = await freePort();
  await assert.rejects(connectController({ port, spawn: false, timeoutMs: 300 }));
});

test('request() resolves with the result value and rejects on an error result', async (t) => {
  const port = await freePort();
  const hub = createHub({ port });
  await hub.start();
  t.after(() => hub.stop());

  const viewer = openClient(port, viewerHello());
  t.after(() => viewer.close());
  await viewer.opened;
  const { id } = await viewer.next(isType('welcome'));

  const client = await connectController({ port, spawn: false, name: 'test' });
  t.after(() => client.close());
  const viewers = await client.request({ type: 'list' });
  assert.deepEqual(viewers.map((v) => v.id), [id]);

  await assert.rejects(
    client.request({ type: 'command', target: 'v99', name: 'title', value: '' }),
    (error) => error.code === 'unknown_viewer',
  );
});

test('client events reach on() listeners', async (t) => {
  const port = await freePort();
  const hub = createHub({ port });
  await hub.start();
  t.after(() => hub.stop());
  const client = await connectController({ port, spawn: false });
  t.after(() => client.close());
  const joinedNote = new Promise((resolve) => client.on('viewer_joined', resolve));
  const viewer = openClient(port, viewerHello());
  t.after(() => viewer.close());
  const note = await joinedNote;
  assert.match(note.viewer.id, /^v\d+$/);
});

test('with spawning on, a missing hub is started and then shut down by request', async () => {
  const port = await freePort();
  const client = await connectController({ port, spawn: true, cliPath: CLI, timeoutMs: 5000 });
  const status = await client.request({ type: 'hub', op: 'status' });
  assert.equal(status.port, port);
  await client.request({ type: 'hub', op: 'shutdown' });
  client.close();
  await assert.rejects(connectController({ port, spawn: false, timeoutMs: 1000 }));
});
