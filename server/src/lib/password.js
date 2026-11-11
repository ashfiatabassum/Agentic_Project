// Password hashing with Node's built-in scrypt (PRD §10, Q6). No third-party dependency.
// Stored format: scrypt$N=16384,r=8,p=1$<salt base64>$<hash base64>
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scrypt(password, salt, KEY_LENGTH, PARAMS);
  return `scrypt$N=${PARAMS.N},r=${PARAMS.r},p=${PARAMS.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = typeof stored === 'string' ? stored.split('$') : [];
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const params = Object.fromEntries(parts[1].split(',').map((kv) => kv.split('=')).map(([k, v]) => [k, Number(v)]));
  const salt = Buffer.from(parts[2], 'base64');
  const expected = Buffer.from(parts[3], 'base64');
  const actual = await scrypt(password, salt, expected.length, { N: params.N, r: params.r, p: params.p });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
