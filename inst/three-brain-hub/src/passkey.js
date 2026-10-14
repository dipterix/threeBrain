// A passkey is what the user pastes into the viewer: "<port>", or
// "<port>.<key>" when the hub was started with a key
import { randomBytes } from 'node:crypto';

export const DEFAULT_PORT = 17285;

const PASSKEY = /^(\d{1,5})(?:\.([A-Za-z0-9_-]+))?$/;
const KEY = /^[A-Za-z0-9_-]+$/;

export function parsePasskey(text) {
  const match = String(text ?? '').trim().match(PASSKEY);
  const port = match ? Number(match[1]) : NaN;
  if (!match || port < 1 || port > 65535) {
    throw new Error(
      `Invalid passkey "${text}": expected "<port>" or "<port>.<key>", for example "${DEFAULT_PORT}"`);
  }
  return { port, key: match[2] ?? null };
}

export function formatPasskey({ port, key = null }) {
  return key ? `${port}.${key}` : `${port}`;
}

export function isValidKey(key) {
  return typeof key === 'string' && KEY.test(key);
}

// 12 URL-safe characters: short enough to read out, long enough not to guess
export function generateKey() {
  return randomBytes(9).toString('base64url');
}
