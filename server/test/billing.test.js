// M7: billing demo (FR-13; plan.md E101–E110), through the real API against testimonial_mvp_test.
// The upgrade is a simulation: these tests also check that the client can never choose the plan
// or the amount, and that parallel requests record exactly one event.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { closePool, getPool } from '../src/db.js';
import { Client, signedInOwner, startServer, validSpace } from './helpers/api.js';

let app;
before(async () => {
  app = await startServer({ rateLimits: { register: { max: 1000 } } });
});
after(async () => {
  await app.close();
  await closePool();
});

const upgrade = (client, json = {}) => client.post('/api/billing/simulate-upgrade', json);

async function eventsOf(userId) {
  const [rows] = await getPool().execute('SELECT * FROM billing_events WHERE user_id = ? ORDER BY id', [userId]);
  return rows;
}

async function planOf(userId) {
  const [[row]] = await getPool().execute('SELECT plan_code FROM users WHERE id = ?', [userId]);
  return row.plan_code;
}

async function fill(spaceId, n) {
  const rows = Array.from({ length: n }, (_, i) => [spaceId, `Filler ${i}`, 'f@example.com', 'x', 300 - i / 100]);
  await getPool().query(
    'INSERT INTO testimonials (space_id, name, email, body, created_at) VALUES ' +
      rows.map(() => '(?, ?, ?, ?, UTC_TIMESTAMP() - INTERVAL ? DAY)').join(', '),
    rows.flat(),
  );
}

test('GET /api/plans: public, both plans from the database in display order (E101)', async () => {
  const res = await new Client(app.baseUrl).get('/api/plans');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.plans, [
    { code: 'free', name: 'Free', priceMinor: 0, currency: 'BDT', interval: null, maxSpaces: 3, maxVisiblePerSpace: 100 },
    { code: 'paid', name: 'Paid', priceMinor: 99900, currency: 'BDT', interval: 'month', maxSpaces: 25, maxVisiblePerSpace: 1000 },
  ]);
});

test('billing needs a session; the upgrade is JSON-only (CSRF guard)', async () => {
  const anon = new Client(app.baseUrl);
  assert.equal((await anon.get('/api/billing')).status, 401);
  assert.equal((await upgrade(anon)).status, 401);

  const { client, user } = await signedInOwner(app.baseUrl);
  const form = await client.request('POST', '/api/billing/simulate-upgrade', {
    raw: { body: 'plan=paid', headers: { 'content-type': 'application/x-www-form-urlencoded' } },
  });
  assert.equal(form.status, 415);
  assert.equal(await planOf(user.id), 'free');
  assert.equal((await eventsOf(user.id)).length, 0);
});

test('simulated upgrade: Free → Paid with exactly one simulated event; the body cannot choose plan or amount (E102)', async () => {
  const { client, user } = await signedInOwner(app.baseUrl);
  const before = await client.get('/api/billing');
  assert.equal(before.body.plan.code, 'free');
  assert.equal(before.body.upgradeTo.code, 'paid');
  assert.deepEqual(before.body.events, []);

  const res = await upgrade(client, { plan: 'free', planCode: 'enterprise', amount: 0, amountMinor: 1, currency: 'USD', isSimulated: 0 });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.deepEqual(res.body.user, { ...user, plan: 'paid' });
  assert.equal(res.body.event.type, 'upgrade_simulated');
  assert.equal(res.body.event.simulated, true);
  assert.equal(res.body.event.amountMinor, 99900);

  const rows = await eventsOf(user.id);
  assert.equal(rows.length, 1);
  assert.deepEqual(
    { type: rows[0].event_type, from: rows[0].from_plan_code, to: rows[0].to_plan_code, amount: rows[0].amount_minor, currency: rows[0].currency, simulated: rows[0].is_simulated },
    { type: 'upgrade_simulated', from: 'free', to: 'paid', amount: 99900, currency: 'BDT', simulated: 1 },
  );
  assert.equal(await planOf(user.id), 'paid');
  // The plan is read from the database: /me and the billing page agree, and survive a new login.
  assert.equal((await client.get('/api/auth/me')).body.user.plan, 'paid');
  const after = await client.get('/api/billing');
  assert.equal(after.body.plan.code, 'paid');
  assert.equal(after.body.upgradeTo, null);
  assert.equal(after.body.events.length, 1);
  assert.deepEqual(
    { from: after.body.events[0].fromPlan, to: after.body.events[0].toPlan, simulated: after.body.events[0].simulated },
    { from: 'Free', to: 'Paid', simulated: true },
  );
});

test('a second upgrade is refused (409) and writes nothing (D6: Paid stays Paid)', async () => {
  const { client, user } = await signedInOwner(app.baseUrl);
  assert.equal((await upgrade(client)).status, 201);
  const again = await upgrade(client);
  assert.equal(again.status, 409);
  assert.equal(again.body.error, 'You are already on the Paid plan (demo).');
  assert.equal((await eventsOf(user.id)).length, 1);
  assert.equal(await planOf(user.id), 'paid');
});

test('GET /api/billing includes the plan list, so the page needs no second request', async () => {
  const { client } = await signedInOwner(app.baseUrl);
  const res = await client.get('/api/billing');
  assert.deepEqual(res.body.plans.map((p) => p.code), ['free', 'paid']);
});

test('a Paid owner at 25 spaces is told to delete one (no upgrade offered)', async () => {
  const { client, user } = await signedInOwner(app.baseUrl);
  await upgrade(client);
  const rows = Array.from({ length: 25 }, (_, i) => [user.id, `paid-${user.id}-${i}`, `Space ${i}`, 'Prompt?']);
  await getPool().query(`INSERT INTO spaces (owner_id, slug, title, prompt) VALUES ${rows.map(() => '(?, ?, ?, ?)').join(', ')}`, rows.flat());
  const res = await client.post('/api/spaces', validSpace({ title: 'Space 26' }));
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'Your Paid plan allows 25 spaces. Delete a space to make room.');
});

test('5 parallel upgrades → exactly one event (owner row lock)', async () => {
  const { client, user } = await signedInOwner(app.baseUrl);
  const results = await Promise.all(Array.from({ length: 5 }, () => upgrade(client)));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409, 409, 409]);
  assert.equal((await eventsOf(user.id)).length, 1);
  assert.equal(await planOf(user.id), 'paid');
});

test('the plan persists after logging out and in', async () => {
  const { client, credentials } = await signedInOwner(app.baseUrl);
  await upgrade(client);
  assert.equal((await client.post('/api/auth/logout')).status, 204);
  const fresh = new Client(app.baseUrl);
  const login = await fresh.post('/api/auth/login', { email: credentials.email, password: credentials.password });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.plan, 'paid');
});

test('upgrading raises the limits: 101 → 0 locked, and a 4th space can be created (E108, FR-12)', async () => {
  const { client } = await signedInOwner(app.baseUrl);
  const spaces = [];
  for (let i = 0; i < 3; i += 1) {
    const res = await client.post('/api/spaces', validSpace({ title: `Space ${i + 1}` }));
    assert.equal(res.status, 201);
    spaces.push(res.body.space);
  }
  await fill(spaces[0].id, 101);
  const lockedBefore = await client.get(`/api/spaces/${spaces[0].id}/testimonials`);
  assert.deepEqual(lockedBefore.body.counts, { visible: 100, locked: 1, total: 101 });
  const fourth = await client.post('/api/spaces', validSpace({ title: 'Space 4' }));
  assert.equal(fourth.status, 403);
  assert.equal(fourth.body.error, 'Your Free plan allows 3 spaces. Upgrade to Paid (demo) or delete a space to make room.');

  assert.equal((await upgrade(client)).status, 201);
  const after = await client.get(`/api/spaces/${spaces[0].id}/testimonials`);
  assert.deepEqual(after.body.counts, { visible: 101, locked: 0, total: 101 });
  assert.equal((await client.post('/api/spaces', validSpace({ title: 'Space 4' }))).status, 201);
});

test('billing history is per owner: another owner never sees my events', async () => {
  const a = await signedInOwner(app.baseUrl);
  const b = await signedInOwner(app.baseUrl);
  await upgrade(a.client);
  const bBilling = await b.client.get('/api/billing');
  assert.equal(bBilling.body.plan.code, 'free');
  assert.deepEqual(bBilling.body.events, []);
  assert.equal(await planOf(b.user.id), 'free');
});

test('the database refuses a non-simulated billing event (CHECK is_simulated = 1)', async () => {
  const { user } = await signedInOwner(app.baseUrl);
  await assert.rejects(
    getPool().execute(
      `INSERT INTO billing_events (user_id, event_type, from_plan_code, to_plan_code, amount_minor, currency, is_simulated)
       VALUES (?, 'upgrade_simulated', 'free', 'paid', 99900, 'BDT', 0)`,
      [user.id],
    ),
    /chk_billing_events_simulated|Check constraint/,
  );
});
