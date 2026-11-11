import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/lib/password.js';

test('hashPassword stores scrypt format, never the plain password, with a random salt', async () => {
  const a = await hashPassword('correct horse');
  const b = await hashPassword('correct horse');
  assert.match(a, /^scrypt\$N=16384,r=8,p=1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.ok(!a.includes('correct horse'));
  assert.notEqual(a, b);
});

test('verifyPassword accepts the right password and rejects wrong or malformed input', async () => {
  const stored = await hashPassword('correct horse');
  assert.equal(await verifyPassword('correct horse', stored), true);
  assert.equal(await verifyPassword('wrong horse', stored), false);
  assert.equal(await verifyPassword('correct horse', 'not-a-hash'), false);
  assert.equal(await verifyPassword('correct horse', null), false);
});
