// A controller connection to the hub, used by the MCP server and the CLI.
// Uses the `ws` client so it also runs on Node 18, which has no global WebSocket.
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { DEFAULT_PORT } from './passkey.js';

const PROTOCOL = 1;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class HubError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function open({ port, key, name, connectTimeoutMs }) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new HubError('timeout', `No answer from 127.0.0.1:${port}`));
    }, connectTimeoutMs);
    let welcomed = false;

    ws.once('open', () => {
      ws.send(JSON.stringify({
        type: 'hello', protocol: PROTOCOL, role: 'controller', name, ...(key ? { key } : {}),
      }));
    });
    ws.once('error', (error) => {
      clearTimeout(timer);
      if (!welcomed) { reject(error); }
    });
    ws.once('close', (code, reason) => {
      clearTimeout(timer);
      if (welcomed) { return; }
      const message = reason.toString() || `Hub closed the connection (${code})`;
      reject(new HubError(code === 4401 ? 'wrong_key' : 'refused', message));
    });
    ws.on('message', function onFirst(data) {
      let message;
      try { message = JSON.parse(data.toString()); } catch (e) { return; }
      if (message.type !== 'welcome') { return; }
      ws.off('message', onFirst);
      welcomed = true;
      clearTimeout(timer);
      resolve(new HubClient(ws, message));
    });
  });
}

export class HubClient extends EventEmitter {
  constructor(ws, welcome) {
    super();
    this.ws = ws;
    this.id = welcome.id;
    this.hub = welcome.hub;
    this._requests = new Map();
    this._counter = 0;
    ws.on('message', (data) => {
      let message;
      try { message = JSON.parse(data.toString()); } catch (e) { return; }
      if (message.type === 'result') {
        const request = this._requests.get(message.id);
        if (!request) { return; }
        this._requests.delete(message.id);
        clearTimeout(request.timer);
        if (message.ok) {
          request.resolve(message.value);
        } else {
          const error = message.error ?? {};
          request.reject(new HubError(error.code ?? 'exception', error.message ?? 'Request failed'));
        }
      } else if (typeof message.type === 'string') {
        // event, viewer_joined, viewer_left
        this.emit(message.type, message);
      }
    });
    ws.on('close', () => {
      for (const request of this._requests.values()) {
        clearTimeout(request.timer);
        request.reject(new HubError('closed', 'The connection to the hub closed'));
      }
      this._requests.clear();
      this.emit('close');
    });
  }

  get connected() {
    return this.ws.readyState === WebSocket.OPEN;
  }

  // Sends one message and resolves with its result's value
  request(message, { timeoutMs = 35000 } = {}) {
    const id = message.id ?? `q${++this._counter}`;
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new HubError('closed', 'Not connected to the hub'));
        return;
      }
      const timer = setTimeout(() => {
        this._requests.delete(id);
        reject(new HubError('timeout', `No answer within ${timeoutMs} ms`));
      }, timeoutMs);
      this._requests.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ ...message, id }));
    });
  }

  close() {
    this.ws.close();
  }
}

export function spawnHub({ cliPath, port, key = null, idleMinutes = null }) {
  const args = [cliPath, 'serve', '--port', String(port)];
  if (key) { args.push('--key', key); }
  if (idleMinutes !== null) { args.push('--idle-minutes', String(idleMinutes)); }
  const child = spawn(process.execPath, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}

// Connects to the hub on `port`. With `spawn`, a missing hub is started first
// (detached, so it outlives this process) from the script at `cliPath`.
export async function connectController({
  port = DEFAULT_PORT,
  key = null,
  name = 'client',
  spawn: startHub = false,
  cliPath = process.argv[1],
  timeoutMs = 3000,
} = {}) {
  const options = { port, key, name, connectTimeoutMs: Math.max(500, timeoutMs) };
  try {
    return await open(options);
  } catch (error) {
    if (!startHub || error.code !== 'ECONNREFUSED') { throw error; }
  }
  spawnHub({ cliPath, port, key });
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    await sleep(100);
    try {
      return await open(options);
    } catch (error) {
      lastError = error;
      if (error.code !== 'ECONNREFUSED') { throw error; }
    }
  }
  throw lastError ?? new HubError('timeout', `The hub did not start on 127.0.0.1:${port}`);
}
