// Concurrency tests for the locking rules in data-model.md (D10, R6).
// Space creation goes through the real service (M2); the submit pattern moves into a service in M3.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { closePool } from '../src/db.js';
import { createSpace as createSpaceService } from '../src/services/spaces.js';
import { connect, createOwner, createSpace, unique } from './helpers/db.js';

let conn;
before(async () => { conn = await connect(); });
after(async () => { await conn?.end(); await closePool(); });

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Submit pattern: lock the space row, enforce the hard cap, insert.
const HARD_CAP = 1000;
async function submitWithHardCap(spaceId) {
  const c = await connect();
  try {
    await c.beginTransaction();
    await c.execute('SELECT id FROM spaces WHERE id = ? FOR UPDATE', [spaceId]);
    const [[{ n }]] = await c.execute('SELECT COUNT(*) AS n FROM testimonials WHERE space_id = ?', [spaceId]);
    await pause(50);
    if (n >= HARD_CAP) { await c.rollback(); return 'rejected'; }
    await c.execute('INSERT INTO testimonials (space_id, name, email, body) VALUES (?, ?, ?, ?)', [spaceId, 'Racer', 'r@example.com', 'race']);
    await c.commit();
    return 'saved';
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    await c.end();
  }
}

test('4 concurrent space creations at the Free limit end with exactly 3 spaces (real service)', async () => {
  const owner = await createOwner(conn);
  await createSpace(conn, owner.id); // owner already has 1 of 3
  const input = () => ({ values: { slug: unique('race').toLowerCase(), title: 'S', prompt: 'P' }, questions: [] });
  const outcomes = await Promise.allSettled(Array.from({ length: 4 }, () => createSpaceService(owner.id, input())));
  const [[{ n }]] = await conn.execute('SELECT COUNT(*) AS n FROM spaces WHERE owner_id = ?', [owner.id]);
  assert.equal(n, 3, `outcomes: ${outcomes.map((o) => o.reason?.message ?? o.status).join(', ')}`);
  assert.equal(outcomes.filter((o) => o.status === 'fulfilled').length, 2);
  for (const o of outcomes.filter((x) => x.status === 'rejected')) assert.equal(o.reason.status, 403);
});

test('4 concurrent submissions at the 1,000 hard cap never exceed 1,000 saved', async () => {
  const owner = await createOwner(conn, { plan_code: 'paid' });
  const space = await createSpace(conn, owner.id);
  const rows = Array.from({ length: HARD_CAP - 1 }, (_, i) => [space.id, `C${i}`, 'c@example.com', 'b']);
  await conn.query('INSERT INTO testimonials (space_id, name, email, body) VALUES ?', [rows]);

  const outcomes = await Promise.all(Array.from({ length: 4 }, () => submitWithHardCap(space.id)));
  const [[{ n }]] = await conn.execute('SELECT COUNT(*) AS n FROM testimonials WHERE space_id = ?', [space.id]);
  assert.equal(n, HARD_CAP, `outcomes: ${outcomes.join(', ')}`);
  assert.equal(outcomes.filter((o) => o === 'saved').length, 1);
});
