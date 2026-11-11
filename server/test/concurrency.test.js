// Concurrency tests for the locking rules in data-model.md (D10, R6).
// These exercise the database pattern; M2 will call the real API services the same way.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connect, createOwner, createSpace, unique } from './helpers/db.js';

let conn;
before(async () => { conn = await connect(); });
after(async () => { await conn?.end(); });

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Create-space pattern: lock the owner row, read the plan limit, count, insert or reject.
async function createSpaceWithQuota(ownerId) {
  const c = await connect();
  try {
    await c.beginTransaction();
    const [[owner]] = await c.execute(
      'SELECT u.id, p.max_spaces FROM users u JOIN plans p ON p.code = u.plan_code WHERE u.id = ? FOR UPDATE', [ownerId]);
    const [[{ n }]] = await c.execute('SELECT COUNT(*) AS n FROM spaces WHERE owner_id = ?', [ownerId]);
    await pause(50); // widen the race window
    if (n >= owner.max_spaces) { await c.rollback(); return 'rejected'; }
    await c.query('INSERT INTO spaces SET ?', [{ owner_id: ownerId, slug: unique('race'), title: 'S', prompt: 'P' }]);
    await c.commit();
    return 'created';
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    await c.end();
  }
}

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

test('4 concurrent space creations at the Free limit end with exactly 3 spaces', async () => {
  const owner = await createOwner(conn);
  await createSpace(conn, owner.id); // owner already has 1 of 3
  const outcomes = await Promise.all(Array.from({ length: 4 }, () => createSpaceWithQuota(owner.id)));
  const [[{ n }]] = await conn.execute('SELECT COUNT(*) AS n FROM spaces WHERE owner_id = ?', [owner.id]);
  assert.equal(n, 3, `outcomes: ${outcomes.join(', ')}`);
  assert.deepEqual(outcomes.filter((o) => o === 'created').length, 2);
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
