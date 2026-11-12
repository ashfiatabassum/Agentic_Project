// Test database helpers. Tests run against testimonial_mvp_test only (server/.env.test);
// `npm test` resets and migrates that database first (pretest script).
import mysql from 'mysql2/promise';
import { config } from '../../src/config.js';
import { SET_UTC } from '../../src/db.js';

export const TEST_DATABASE = 'testimonial_mvp_test';

export function assertTestDatabase() {
  if (config.db.database !== TEST_DATABASE) {
    throw new Error(`Refusing to run database tests against "${config.db.database}"; expected ${TEST_DATABASE} (server/.env.test)`);
  }
}

export async function connect() {
  assertTestDatabase();
  const conn = await mysql.createConnection({ ...config.db, charset: 'utf8mb4', timezone: 'Z' });
  await conn.query(SET_UTC); // same UTC session as the app pool (src/db.js)
  return conn;
}

let counter = 0;
export const unique = (prefix) => `${prefix}-${process.pid}-${Date.now().toString(36)}-${(counter += 1)}`;

export async function createOwner(conn, overrides = {}) {
  const email = overrides.email ?? `${unique('owner')}@example.com`;
  const [r] = await conn.execute(
    'INSERT INTO users (name, email, password_hash, plan_code) VALUES (?, ?, ?, ?)',
    [overrides.name ?? 'Owner', email, 'scrypt$test', overrides.plan_code ?? 'free'],
  );
  return { id: r.insertId, email };
}

export async function createSpace(conn, ownerId, overrides = {}) {
  const slug = overrides.slug ?? unique('space');
  const [r] = await conn.query('INSERT INTO spaces SET ?', [{ owner_id: ownerId, slug, title: 'Space', prompt: 'Prompt?', ...overrides }]);
  return { id: r.insertId, slug };
}

export async function createTestimonial(conn, spaceId, overrides = {}) {
  const [r] = await conn.query('INSERT INTO testimonials SET ?', [{ space_id: spaceId, name: 'Customer', email: 'c@example.com', body: 'Great!', ...overrides }]);
  return r.insertId;
}

/** Expects the statement to fail with the given MySQL error code (for example ER_CHECK_CONSTRAINT_VIOLATED). */
export async function rejects(promise, code) {
  try {
    await promise;
  } catch (error) {
    if (error.code === code) return error;
    throw new Error(`expected ${code}, got ${error.code}: ${error.message}`);
  }
  throw new Error(`expected ${code}, but the statement succeeded`);
}
