import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { freePort, openClient, controllerHello, isType } from './helpers.js';

// `HUB_ENTRY=dist/threebrain-hub.mjs npm test` runs the same tests on the bundle
const ENTRY = process.env.HUB_ENTRY
  ? fileURLToPath(new URL(`../${process.env.HUB_ENTRY}`, import.meta.url))
  : fileURLToPath(new URL('../src/cli.js', import.meta.url));
const run = promisify(execFile);

function serveInForeground(t, args) {
  const child = spawn(process.execPath, [ENTRY, 'serve', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) { child.kill(); } });
  let stdout = '';
  const firstLine = new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.includes('\n')) { resolve(stdout); }
    });
    child.on('exit', (code) => reject(new Error(`hub exited early (${code})`)));
  });
  const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
  return { child, firstLine, exited };
}

test('--help lists the commands and the folder where hubs are recorded', async () => {
  const folder = '/tmp/threebrain-help-check/hubs';
  const { stdout } = await run(process.execPath, [ENTRY, '--help'],
    { env: { ...process.env, THREEBRAIN_HUB_DIR: folder } });
  assert.match(stdout, /serve/);
  assert.match(stdout, /stop/);
  assert.match(stdout, /list/);
  assert.match(stdout, /17285/);
  // the real folder, readable without R
  assert.ok(stdout.includes(folder), stdout);
  assert.doesNotMatch(stdout, /R_user_dir/);
});

test('serve prints its passkey, and stop shuts it down', async (t) => {
  const port = await freePort();
  const { firstLine, exited } = serveInForeground(t, ['--port', String(port), '--generate-key']);
  const line = await firstLine;
  const match = line.match(new RegExp(`passkey:? (${port}\\.([A-Za-z0-9_-]+))`));
  assert.ok(match, `no passkey in: ${line}`);
  const key = match[2];

  const client = openClient(port, controllerHello({ key }));
  await client.opened;
  await client.next(isType('welcome'));
  client.close();

  await run(process.execPath, [ENTRY, 'stop', '--port', String(port), '--key', key]);
  assert.equal(await exited, 0);
});

test('serve --detach returns once the hub is listening', async (t) => {
  const port = await freePort();
  const { stdout } = await run(process.execPath, [ENTRY, 'serve', '--port', String(port), '--detach']);
  assert.match(stdout, new RegExp(`passkey:? ${port}\\b`));
  t.after(() => run(process.execPath, [ENTRY, 'stop', '--port', String(port)]).catch(() => {}));

  const client = openClient(port, controllerHello());
  await client.opened;
  await client.next(isType('welcome'));
  client.close();
});

test('serve on a busy port exits with an error', async (t) => {
  const port = await freePort();
  const { firstLine } = serveInForeground(t, ['--port', String(port)]);
  await firstLine;
  await assert.rejects(
    run(process.execPath, [ENTRY, 'serve', '--port', String(port)]),
    (error) => error.code === 1 && /already/i.test(error.stderr),
  );
});
