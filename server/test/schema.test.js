// Schema behaviour tests (plan.md M1). Mirrors the 22 design-review checks from the
// mysql / review-mysql-model skill runs, against the real migrations.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connect, createOwner, createSpace, createTestimonial, rejects, unique } from './helpers/db.js';

let conn;
before(async () => { conn = await connect(); });
after(async () => { await conn?.end(); });

const tableNames = async () => {
  const [rows] = await conn.query("SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name");
  return rows.map((r) => r.name);
};

test('migrations create all 10 tables', async () => {
  assert.deepEqual(await tableNames(), [
    'billing_events', 'plans', 'schema_migrations', 'sessions', 'space_questions',
    'spaces', 'testimonial_answers', 'testimonials', 'themes', 'users',
  ]);
});

test('plans and themes are seeded as in data-model.md', async () => {
  const [plans] = await conn.query('SELECT code, price_minor, currency, billing_interval, max_spaces, max_testimonials_per_space FROM plans ORDER BY sort_order');
  assert.deepEqual(plans, [
    { code: 'free', price_minor: 0, currency: 'BDT', billing_interval: null, max_spaces: 3, max_testimonials_per_space: 100 },
    { code: 'paid', price_minor: 99900, currency: 'BDT', billing_interval: 'month', max_spaces: 25, max_testimonials_per_space: 1000 },
  ]);
  const [themes] = await conn.query('SELECT code FROM themes ORDER BY sort_order');
  assert.deepEqual(themes.map((t) => t.code), ['light', 'dark', 'warm']);
});

test('users: unique email, unknown plan rejected, new users default to free', async () => {
  const owner = await createOwner(conn);
  await rejects(createOwner(conn, { email: owner.email }), 'ER_DUP_ENTRY');
  await rejects(createOwner(conn, { plan_code: 'gold' }), 'ER_NO_REFERENCED_ROW_2');
  const [[row]] = await conn.execute('SELECT plan_code FROM users WHERE id = ?', [owner.id]);
  assert.equal(row.plan_code, 'free');
});

test('users.email uses exact (binary) comparison: jose@ and josé@ are different accounts', async () => {
  const base = unique('jose');
  await createOwner(conn, { email: `${base}@example.com` });
  await assert.doesNotReject(createOwner(conn, { email: `${base.replace('jose', 'josé')}@example.com` }));
});

test('spaces: slug rules, unique slug, colour, field modes, theme FK', async () => {
  const owner = await createOwner(conn);
  await rejects(createSpace(conn, owner.id, { slug: 'Bad_Slug' }), 'ER_CHECK_CONSTRAINT_VIOLATED');
  await rejects(createSpace(conn, owner.id, { slug: 'ab' }), 'ER_CHECK_CONSTRAINT_VIOLATED');
  await rejects(createSpace(conn, owner.id, { slug: '-leading' }), 'ER_CHECK_CONSTRAINT_VIOLATED');
  await rejects(createSpace(conn, owner.id, { brand_color: 'red' }), 'ER_CHECK_CONSTRAINT_VIOLATED');
  await rejects(createSpace(conn, owner.id, { rating_mode: 'maybe' }), 'ER_CHECK_CONSTRAINT_VIOLATED');
  await rejects(createSpace(conn, owner.id, { theme_code: 'neon' }), 'ER_NO_REFERENCED_ROW_2');
  const space = await createSpace(conn, owner.id);
  await rejects(createSpace(conn, owner.id, { slug: space.slug }), 'ER_DUP_ENTRY');
  const [[row]] = await conn.execute('SELECT subtitle, thank_you_message, theme_code, brand_color, photo_mode FROM spaces WHERE id = ?', [space.id]);
  assert.deepEqual(row, { subtitle: '', thank_you_message: '', theme_code: 'light', brand_color: '#4F46E5', photo_mode: 'off' });
});

test('testimonials: consent and publication flags default to 0; rating 1-5 only', async () => {
  const owner = await createOwner(conn);
  const space = await createSpace(conn, owner.id);
  const id = await createTestimonial(conn, space.id);
  const [[flags]] = await conn.execute('SELECT consent_public, consent_social, is_hidden, is_favorite, on_wall FROM testimonials WHERE id = ?', [id]);
  assert.deepEqual(flags, { consent_public: 0, consent_social: 0, is_hidden: 0, is_favorite: 0, on_wall: 0 });
  await rejects(createTestimonial(conn, space.id, { rating: 6 }), 'ER_CHECK_CONSTRAINT_VIOLATED');
  await rejects(createTestimonial(conn, space.id, { rating: 0 }), 'ER_CHECK_CONSTRAINT_VIOLATED');
});

test('on_wall requires public consent and not hidden (R4)', async () => {
  const owner = await createOwner(conn);
  const space = await createSpace(conn, owner.id);
  const noConsent = await createTestimonial(conn, space.id);
  await rejects(conn.execute('UPDATE testimonials SET on_wall = 1 WHERE id = ?', [noConsent]), 'ER_CHECK_CONSTRAINT_VIOLATED');
  const consented = await createTestimonial(conn, space.id, { consent_public: 1 });
  await conn.execute('UPDATE testimonials SET on_wall = 1 WHERE id = ?', [consented]);
  await rejects(conn.execute('UPDATE testimonials SET is_hidden = 1 WHERE id = ?', [consented]), 'ER_CHECK_CONSTRAINT_VIOLATED');
  await conn.execute('UPDATE testimonials SET is_hidden = 1, on_wall = 0 WHERE id = ?', [consented]); // hiding takes it off the wall
});

test('billing events: only simulated upgrades can be recorded', async () => {
  const owner = await createOwner(conn);
  const insert = (type, simulated) => conn.execute(
    'INSERT INTO billing_events (user_id, event_type, from_plan_code, to_plan_code, amount_minor, currency, is_simulated) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [owner.id, type, 'free', 'paid', 99900, 'BDT', simulated],
  );
  await rejects(insert('upgrade_simulated', 0), 'ER_CHECK_CONSTRAINT_VIOLATED');
  await rejects(insert('refund', 1), 'ER_CHECK_CONSTRAINT_VIOLATED');
  await assert.doesNotReject(insert('upgrade_simulated', 1));
});

test('deleting a question keeps old answers readable (question_id NULL, snapshot kept)', async () => {
  const owner = await createOwner(conn);
  const space = await createSpace(conn, owner.id);
  const t = await createTestimonial(conn, space.id);
  const [q] = await conn.execute('INSERT INTO space_questions (space_id, question_text, position) VALUES (?, ?, 1)', [space.id, 'What did you like?']);
  await conn.execute('INSERT INTO testimonial_answers (testimonial_id, question_id, question_snapshot, answer_text, position) VALUES (?, ?, ?, ?, 1)', [t, q.insertId, 'What did you like?', 'The bread']);
  await conn.execute('DELETE FROM space_questions WHERE id = ?', [q.insertId]);
  const [[a]] = await conn.execute('SELECT question_id, question_snapshot, answer_text FROM testimonial_answers WHERE testimonial_id = ?', [t]);
  assert.deepEqual(a, { question_id: null, question_snapshot: 'What did you like?', answer_text: 'The bread' });
});

test('deleting a space cascades to questions, testimonials and answers; deleting a user cascades to everything owned', async () => {
  const owner = await createOwner(conn);
  const space = await createSpace(conn, owner.id);
  const t = await createTestimonial(conn, space.id);
  await conn.execute('INSERT INTO space_questions (space_id, question_text, position) VALUES (?, ?, 1)', [space.id, 'Q']);
  await conn.execute('INSERT INTO testimonial_answers (testimonial_id, question_snapshot, answer_text, position) VALUES (?, ?, ?, 1)', [t, 'Q', 'A']);
  await conn.execute('DELETE FROM spaces WHERE id = ?', [space.id]);
  const [[left]] = await conn.execute(
    `SELECT (SELECT COUNT(*) FROM testimonials WHERE space_id = ?) AS t,
            (SELECT COUNT(*) FROM space_questions WHERE space_id = ?) AS q,
            (SELECT COUNT(*) FROM testimonial_answers WHERE testimonial_id = ?) AS a`, [space.id, space.id, t]);
  assert.deepEqual(left, { t: 0, q: 0, a: 0 });

  const space2 = await createSpace(conn, owner.id);
  await createTestimonial(conn, space2.id);
  await conn.execute('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, UTC_TIMESTAMP() + INTERVAL 7 DAY)', ['a'.repeat(64), owner.id]);
  await conn.execute('DELETE FROM users WHERE id = ?', [owner.id]);
  const [[gone]] = await conn.execute('SELECT (SELECT COUNT(*) FROM spaces WHERE owner_id = ?) + (SELECT COUNT(*) FROM sessions WHERE user_id = ?) AS n', [owner.id, owner.id]);
  assert.equal(gone.n, 0);
});

// Accept-but-lock ranking (data-model.md "Rules implemented in queries").
const VISIBILITY_SQL = `
  SELECT SUM(rn <= ?) AS visible, SUM(rn > ?) AS locked
  FROM (SELECT ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn FROM testimonials WHERE space_id = ?) ranked`;

test('accept but lock: oldest N visible, rest locked; upgrade unlocks; deleting frees capacity', async () => {
  const owner = await createOwner(conn);
  const space = await createSpace(conn, owner.id);
  const rows = Array.from({ length: 105 }, (_, i) => [space.id, `C${i}`, `c${i}@example.com`, `body ${i}`]);
  await conn.query('INSERT INTO testimonials (space_id, name, email, body) VALUES ?', [rows]);

  const count = async (n) => { const [[r]] = await conn.query(VISIBILITY_SQL, [n, n, space.id]); return { visible: Number(r.visible), locked: Number(r.locked) }; };
  assert.deepEqual(await count(100), { visible: 100, locked: 5 }); // Free
  assert.deepEqual(await count(1000), { visible: 105, locked: 0 }); // Paid

  const [[oldest]] = await conn.execute('SELECT id FROM testimonials WHERE space_id = ? ORDER BY created_at, id LIMIT 1', [space.id]);
  await conn.execute('DELETE FROM testimonials WHERE id = ?', [oldest.id]);
  assert.deepEqual(await count(100), { visible: 100, locked: 4 });
});

test('visibility ranking reads the (space_id, created_at) index, not a full table scan', async () => {
  const [rows] = await conn.query(`EXPLAIN FORMAT=TREE ${VISIBILITY_SQL}`, [100, 100, 1]);
  const plan = Object.values(rows[0])[0];
  assert.match(plan, /index lookup on testimonials using ix_testimonials_space_created/i, plan);
  assert.doesNotMatch(plan, /Table scan on testimonials/i, plan);
});
