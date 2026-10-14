// The hub: viewers (browser pages) and controllers (R, Python, agents) connect
// here, and the hub passes commands to viewers and their answers and events
// back. It listens on 127.0.0.1 only, so other computers cannot reach it.
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { WebSocketServer } from 'ws';
import { DEFAULT_PORT, formatPasskey, generateKey, isValidKey } from './passkey.js';
import { VERSION } from './version.js';

export const PROTOCOL = 1;
const HELLO_TIMEOUT_MS = 5000;
const EVENTS_KEPT = 50;
// screenshots travel as PNG data URLs
const MAX_PAYLOAD = 64 * 1024 * 1024;

export function createHub({
  port = DEFAULT_PORT,
  key = null,
  host = '127.0.0.1',
  idleMinutes = 30,
  requestTimeoutMs = 30000,
} = {}) {
  const hub = new EventEmitter();
  hub.host = host;
  hub.port = port;
  hub.key = key;

  const viewers = new Map();      // id -> { id, role, ws, meta }
  const controllers = new Map();  // id -> { id, role, ws, name, subscription }
  const pending = new Map();      // hub request id -> { controllerId, clientId, viewerId, timer }
  const events = new Map();       // viewer id -> last events
  const counters = { v: 0, c: 0, h: 0 };
  let server = null;
  let wss = null;
  let idleTimer = null;
  let stopped = false;
  let stopping = null;

  const send = (ws, message) => {
    if (ws.readyState === ws.OPEN) { ws.send(JSON.stringify(message)); }
  };

  const reply = (controller, id, ok, value, error) => {
    send(controller.ws, ok ? { type: 'result', id, ok: true, value: value ?? null }
                           : { type: 'result', id, ok: false, error });
  };

  const hubInfo = () => ({
    port: hub.port,
    keyed: hub.key !== null,
    passkey: formatPasskey({ port: hub.port, key: hub.key }),
    viewers: viewers.size,
    controllers: controllers.size,
    version: VERSION,
  });

  const notifyControllers = (message) => {
    for (const controller of controllers.values()) { send(controller.ws, message); }
  };

  // ---- idle shutdown -----------------------------------------------------------
  const scheduleIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = null;
    // a stopped hub must not re-arm: the closing sockets call this afterwards
    if (stopped || !(idleMinutes > 0) || !wss || wss.clients.size > 0) { return; }
    idleTimer = setTimeout(() => hub.emit('idle'), idleMinutes * 60 * 1000);
  };

  // ---- connections -------------------------------------------------------------
  const admit = (ws, hello, request) => {
    if (!hello || hello.type !== 'hello' || hello.protocol !== PROTOCOL ||
        (hello.role !== 'viewer' && hello.role !== 'controller')) {
      ws.close(4400, 'Expected a protocol 1 hello from a viewer or a controller');
      return null;
    }
    if (hub.key !== null && hello.key !== hub.key) {
      ws.close(4401, 'Wrong or missing key');
      return null;
    }
    let client;
    if (hello.role === 'viewer') {
      const id = `v${++counters.v}`;
      const info = hello.viewer && typeof hello.viewer === 'object' ? hello.viewer : {};
      const meta = {
        id,
        title: typeof info.title === 'string' ? info.title : '',
        page_title: typeof info.page_title === 'string' ? info.page_title : '',
        subjects: Array.isArray(info.subjects) ? info.subjects : [],
        container_id: typeof info.container_id === 'string' ? info.container_id : '',
        version: info.version ?? null,
        origin: request.headers.origin ?? null,
        connected_at: Date.now(),
        // whether the page is shown; null when the viewer does not say
        visible: typeof info.visible === 'boolean' ? info.visible : null,
        visibility_since: Date.now(),
      };
      client = { id, role: 'viewer', ws, meta };
      viewers.set(id, client);
      events.set(id, []);
    } else {
      const id = `c${++counters.c}`;
      client = { id, role: 'controller', ws, name: String(hello.name ?? ''), subscription: null };
      controllers.set(id, client);
    }
    send(ws, { type: 'welcome', protocol: PROTOCOL, id: client.id, hub: hubInfo() });
    if (client.role === 'viewer') {
      notifyControllers({ type: 'viewer_joined', viewer: client.meta });
    }
    return client;
  };

  const drop = (client) => {
    if (client.role === 'viewer') {
      viewers.delete(client.id);
      events.delete(client.id);
      for (const [hubId, request] of pending) {
        if (request.viewerId !== client.id) { continue; }
        pending.delete(hubId);
        clearTimeout(request.timer);
        const controller = controllers.get(request.controllerId);
        if (controller) {
          reply(controller, request.clientId, false, undefined,
            { code: 'viewer_left', message: `Viewer ${client.id} disconnected before answering` });
        }
      }
      notifyControllers({ type: 'viewer_left', viewer: client.meta });
    } else {
      controllers.delete(client.id);
      for (const [hubId, request] of pending) {
        if (request.controllerId !== client.id) { continue; }
        pending.delete(hubId);
        clearTimeout(request.timer);
      }
    }
  };

  // ---- messages from viewers ---------------------------------------------------
  const onViewerMessage = (viewer, message) => {
    if (message.type === 'result') {
      const request = pending.get(message.id);
      if (!request) { return; }
      pending.delete(message.id);
      clearTimeout(request.timer);
      const controller = controllers.get(request.controllerId);
      if (!controller) { return; }
      if (message.ok) {
        reply(controller, request.clientId, true, message.value);
      } else {
        reply(controller, request.clientId, false, undefined,
          message.error ?? { code: 'exception', message: 'The viewer reported an error' });
      }
    } else if (message.type === 'event' && typeof message.name === 'string') {
      const event = { type: 'event', source: viewer.id, name: message.name,
                      value: message.value ?? null, time: Date.now() };
      if (event.name === 'visibility' && typeof event.value?.visible === 'boolean') {
        viewer.meta.visible = event.value.visible;
        viewer.meta.visibility_since = event.time;
      }
      const kept = events.get(viewer.id);
      kept.push(event);
      if (kept.length > EVENTS_KEPT) { kept.splice(0, kept.length - EVENTS_KEPT); }
      for (const controller of controllers.values()) {
        const subscription = controller.subscription;
        if (!subscription) { continue; }
        const targetOk = subscription.targets === '*' || subscription.targets.includes(viewer.id);
        const nameOk = subscription.names === '*' || subscription.names.includes(event.name);
        if (targetOk && nameOk) { send(controller.ws, event); }
      }
    }
  };

  // ---- messages from controllers -----------------------------------------------
  const routeCommand = (controller, message) => {
    const viewer = viewers.get(message.target);
    if (!viewer) {
      reply(controller, message.id, false, undefined, {
        code: 'unknown_viewer',
        message: `No viewer "${message.target}" is connected; list shows the connected viewers`,
      });
      return;
    }
    const hubId = `h${++counters.h}`;
    const timer = setTimeout(() => {
      pending.delete(hubId);
      reply(controller, message.id, false, undefined, {
        code: 'timeout', message: `Viewer ${viewer.id} did not answer within ${requestTimeoutMs} ms`,
      });
    }, requestTimeoutMs);
    pending.set(hubId, { controllerId: controller.id, clientId: message.id, viewerId: viewer.id, timer });
    send(viewer.ws, { type: 'command', id: hubId, name: message.name, value: message.value ?? null });
  };

  const asList = (value) => (value === undefined || value === null || value === '*')
    ? '*' : (Array.isArray(value) ? value.map(String) : [String(value)]);

  const hubOp = (controller, message) => {
    switch (message.op) {
      case 'status':
        reply(controller, message.id, true, hubInfo());
        break;
      case 'set_key': {
        const next = message.generate ? generateKey() : (message.key ?? null);
        if (next !== null && !isValidKey(next)) {
          reply(controller, message.id, false, undefined,
            { code: 'bad_value', message: 'A key may contain letters, digits, "_" and "-" only' });
          break;
        }
        hub.key = next;
        hub.emit('key', next);
        reply(controller, message.id, true, { passkey: formatPasskey({ port: hub.port, key: hub.key }) });
        break;
      }
      case 'events': {
        const names = asList(message.names);
        const since = Number(message.since) || 0;
        const sources = message.target ? [events.get(message.target) ?? []] : [...events.values()];
        const found = sources.flat()
          .filter((event) => event.time > since && (names === '*' || names.includes(event.name)))
          .sort((a, b) => a.time - b.time);
        reply(controller, message.id, true, found);
        break;
      }
      case 'disconnect': {
        const viewer = viewers.get(message.target);
        if (!viewer) {
          reply(controller, message.id, false, undefined, {
            code: 'unknown_viewer', message: `No viewer "${message.target}" is connected`,
          });
          break;
        }
        // 4001: the viewer stays disconnected instead of reconnecting
        viewer.ws.close(4001, 'Disconnected by the hub');
        reply(controller, message.id, true, { viewer: viewer.id });
        break;
      }
      case 'shutdown':
        reply(controller, message.id, true, null);
        setImmediate(() => hub.stop().then(() => hub.emit('shutdown')));
        break;
      default:
        reply(controller, message.id, false, undefined,
          { code: 'bad_value', message: `Unknown hub operation "${message.op}"` });
    }
  };

  const onControllerMessage = (controller, message) => {
    switch (message.type) {
      case 'command':
        routeCommand(controller, message);
        break;
      case 'list':
        reply(controller, message.id, true, [...viewers.values()].map((viewer) => viewer.meta));
        break;
      case 'subscribe':
        controller.subscription = { targets: asList(message.targets), names: asList(message.names) };
        reply(controller, message.id, true, null);
        break;
      case 'hub':
        hubOp(controller, message);
        break;
      default:
        reply(controller, message.id, false, undefined,
          { code: 'bad_value', message: `Unknown message type "${message.type}"` });
    }
  };

  const onConnection = (ws, request) => {
    scheduleIdle();
    let client = null;
    const helloTimer = setTimeout(() => ws.close(4400, 'No hello received'), HELLO_TIMEOUT_MS);
    ws.on('message', (data) => {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch (e) {
        if (!client) { clearTimeout(helloTimer); ws.close(4400, 'Messages must be JSON'); }
        return;
      }
      if (!client) {
        clearTimeout(helloTimer);
        client = admit(ws, message, request);
      } else if (client.role === 'viewer') {
        onViewerMessage(client, message);
      } else {
        onControllerMessage(client, message);
      }
    });
    ws.on('close', () => {
      clearTimeout(helloTimer);
      if (client) { drop(client); }
      scheduleIdle();
    });
    ws.on('error', () => {});
  };

  // ---- lifecycle ---------------------------------------------------------------
  hub.start = () => new Promise((resolve, reject) => {
    server = http.createServer((request, response) => {
      if (request.url === '/status') {
        // what discovery needs to recognize and describe the hub; never the key
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({
          name: 'threeBrain hub', version: VERSION, port: hub.port, keyed: hub.key !== null,
          viewers: viewers.size, controllers: controllers.size,
        }));
        return;
      }
      response.writeHead(200, { 'content-type': 'text/plain' });
      response.end(`threeBrain hub ${VERSION}\n`);
    });
    wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
    wss.on('connection', onConnection);
    server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
    });
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      hub.port = server.address().port;
      scheduleIdle();
      resolve({ host: hub.host, port: hub.port });
    });
  });

  hub.stop = () => {
    if (stopping) { return stopping; }
    stopped = true;
    stopping = new Promise((resolve) => {
      clearTimeout(idleTimer);
      for (const request of pending.values()) { clearTimeout(request.timer); }
      pending.clear();
      if (!server || !server.listening) { resolve(); return; }
      for (const ws of wss.clients) { ws.terminate(); }
      wss.close();
      server.close(() => resolve());
      server.closeAllConnections?.();
    });
    return stopping;
  };

  return hub;
}
