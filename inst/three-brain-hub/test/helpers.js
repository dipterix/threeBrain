// Test helpers: free ports and small WebSocket clients that speak the hub
// protocol (Node's built-in `WebSocket`, so no test depends on `ws` unless it
// needs a header the built-in client cannot set)
import net from 'node:net';

export function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

// Opens a socket, sends `hello` once open, and queues every message so tests
// can wait for the one they expect with `next(match)`
export function openClient(port, hello, { host = '127.0.0.1', WebSocketClass = WebSocket, options } = {}) {
  const ws = options ? new WebSocketClass(`ws://${host}:${port}/`, options)
                     : new WebSocketClass(`ws://${host}:${port}/`);
  const inbox = [];
  const waiters = [];
  const closeWaiters = [];
  let closed = null;

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
    const waiter = waiters.find((w) => w.match(message));
    if (waiter) {
      waiters.splice(waiters.indexOf(waiter), 1);
      waiter.resolve(message);
    } else {
      inbox.push(message);
    }
  });
  ws.addEventListener('close', (event) => {
    closed = { code: event.code, reason: event.reason };
    closeWaiters.splice(0).forEach((resolve) => resolve(closed));
  });
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      if (hello) { ws.send(JSON.stringify(hello)); }
      resolve();
    });
    ws.addEventListener('error', () => reject(new Error('socket error')));
  });

  return {
    ws,
    inbox,
    opened,
    send(message) { ws.send(JSON.stringify(message)); },
    next(match = () => true, timeoutMs = 2000) {
      const index = inbox.findIndex(match);
      if (index >= 0) { return Promise.resolve(inbox.splice(index, 1)[0]); }
      return new Promise((resolve, reject) => {
        const waiter = { match, resolve: (message) => { clearTimeout(timer); resolve(message); } };
        const timer = setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1);
          reject(new Error('timed out waiting for a message'));
        }, timeoutMs);
        waiters.push(waiter);
      });
    },
    closed(timeoutMs = 2000) {
      if (closed) { return Promise.resolve(closed); }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timed out waiting for close')), timeoutMs);
        closeWaiters.push((value) => { clearTimeout(timer); resolve(value); });
      });
    },
    close() { ws.close(); },
  };
}

export const viewerHello = (extra = {}) => ({
  type: 'hello', protocol: 1, role: 'viewer',
  viewer: { container_id: 'htmlwidget-test', title: 'N27', subjects: ['N27'] },
  ...extra,
});

export const controllerHello = (extra = {}) => ({
  type: 'hello', protocol: 1, role: 'controller', name: 'test', ...extra,
});

export const isType = (type) => (message) => message.type === type;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
