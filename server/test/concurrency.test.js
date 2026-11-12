// Concurrency tests for the locking rules in data-model.md (D10, R6).
// Both run through the real services: space creation (M2) and testimonial submission (M3).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { closePool } from '../src/db.js';
import { createSpace as createSpaceService } from '../src/services/spaces.js';
import { HARD_CAP, submitTestimonial } from '../src/services/testimonials.js';
import { connect, createOwner, createSpace, unique } from './helpers/db.js';

let conn;
before(async () => { conn = await connect(); });
after(async () => { await conn?.end(); await closePool(); });

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

test('4 concurrent submissions at 999 saved end with exactly 1,000 (real submit service)', async () => {
  const owner = await createOwner(conn, { plan_code: 'paid' });
  const space = await createSpace(conn, owner.id);
  const rows = Array.from({ length: HARD_CAP - 1 }, (_, i) => [space.id, `C${i}`, 'c@example.com', 'b']);
  await conn.query('INSERT INTO testimonials (space_id, name, email, body) VALUES ?', [rows]);

  const data = { name: 'Racer', email: 'r@example.com', body: 'race' };
  const outcomes = await Promise.allSettled(Array.from({ length: 4 }, () => submitTestimonial(space.slug, { data })));
  const [[{ n }]] = await conn.execute('SELECT COUNT(*) AS n FROM testimonials WHERE space_id = ?', [space.id]);
  assert.equal(n, HARD_CAP, `outcomes: ${outcomes.map((o) => o.reason?.message ?? o.status).join(', ')}`);
  assert.equal(outcomes.filter((o) => o.status === 'fulfilled').length, 1);
  for (const o of outcomes.filter((x) => x.status === 'rejected')) assert.equal(o.reason.status, 403);
});
