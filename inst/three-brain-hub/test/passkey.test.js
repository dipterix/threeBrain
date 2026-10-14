import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePasskey, formatPasskey, generateKey, DEFAULT_PORT } from '../src/passkey.js';

test('the default port is 17285', () => {
  assert.equal(DEFAULT_PORT, 17285);
});

test('a bare port is a passkey without a key', () => {
  assert.deepEqual(parsePasskey('17285'), { port: 17285, key: null });
  assert.deepEqual(parsePasskey('  9000 '), { port: 9000, key: null });
});

test('port.key splits at the first dot', () => {
  assert.deepEqual(parsePasskey('17285.Ab_c-9'), { port: 17285, key: 'Ab_c-9' });
});

test('malformed passkeys are rejected', () => {
  for (const bad of ['', 'abc', '0', '65536', '17285.', '17285.a b', '-1', '17285.a.b']) {
    assert.throws(() => parsePasskey(bad), /passkey/i, `accepted ${JSON.stringify(bad)}`);
  }
});

test('formatPasskey is the inverse of parsePasskey', () => {
  assert.equal(formatPasskey({ port: 17285, key: null }), '17285');
  assert.equal(formatPasskey({ port: 17285, key: 'xyz' }), '17285.xyz');
  assert.deepEqual(parsePasskey(formatPasskey({ port: 1234, key: 'k_1' })), { port: 1234, key: 'k_1' });
});

test('generated keys are short, URL-safe and different each time', () => {
  const a = generateKey();
  const b = generateKey();
  assert.match(a, /^[A-Za-z0-9_-]{8,16}$/);
  assert.notEqual(a, b);
  assert.deepEqual(parsePasskey(`17285.${a}`), { port: 17285, key: a });
});
