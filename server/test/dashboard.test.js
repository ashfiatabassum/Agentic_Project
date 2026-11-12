// M6: dashboard statistics (FR-11) and plan limits shown in the UI (FR-12), through the real API
// against testimonial_mvp_test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { closePool, getPool } from '../src/db.js';
import { localDate, localDays, offsetAt, parseDashboardQuery } from '../src/services/dashboard.js';
import { Client, signedInOwner, startServer, validSpace } from './helpers/api.js';

let app;
before(async () => {
  app = await startServer({ rateLimits: { register: { max: 1000 } } });
});
after(async () => {
  await app.close();
  await closePool();
});

async function ownerWithSpaces(n = 1) {
  const owner = await signedInOwner(app.baseUrl);
  const spaces = [];
  for (let i = 0; i < n; i += 1) {
    const res = await owner.client.post('/api/spaces', validSpace({ title: `Space ${i + 1}` }));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    spaces.push(res.body.space);
  }
  return { ...owner, spaces };
}

/** Inserts testimonials at exact UTC times (E91). */
async function addAt(spaceId, times, overrides = {}) {
  for (const [i, at] of times.entries()) {
    await getPool().query('INSERT INTO testimonials SET ?', [{
      space_id: spaceId, name: `Customer ${i}`, email: 'c@example.com', body: 'Great', created_at: at, ...overrides,
    }]);
  }
}

async function fill(spaceId, n, daysAgo = 300) {
  const rows = Array.from({ length: n }, (_, i) => [spaceId, `Filler ${i}`, 'f@example.com', 'x', daysAgo - i / 100]);
  await getPool().query(
    'INSERT INTO testimonials (space_id, name, email, body, created_at) VALUES ' +
      rows.map(() => '(?, ?, ?, ?, UTC_TIMESTAMP() - INTERVAL ? DAY)').join(', '),
    rows.flat(),
  );
}

const dashboard = (client, query = '') => client.get(`/api/dashboard${query}`);

// ---------------------------------------------------------------- unit: days and validation

test('localDays: 7 and 30 local days ending today; the start is local midnight in UTC', () => {
  const now = Date.UTC(2026, 10, 12, 20, 0); // 12 Nov 20:00 UTC = 13 Nov 02:00 in Dhaka (UTC+6)
  const dhaka = localDays(7, 'Asia/Dhaka', now);
  assert.equal(dhaka.dates.length, 7);
  assert.equal(dhaka.dates.at(-1), '2026-11-13');
  assert.equal(dhaka.dates[0], '2026-11-07');
  assert.equal(dhaka.fromUtc.toISOString(), '2026-11-06T18:00:00.000Z'); // 7 Nov 00:00 in Dhaka
  const utc = localDays(30, 'UTC', now);
  assert.equal(utc.dates.length, 30);
  assert.equal(utc.dates.at(-1), '2026-11-12');
  // Extremes: UTC+14 is already 13 Nov 10:00; UTC−10 (Honolulu) still 12 Nov 10:00; India is +5:30.
  const kiritimati = localDays(7, 'Pacific/Kiritimati', now);
  assert.equal(kiritimati.dates.at(-1), '2026-11-13');
  assert.equal(kiritimati.fromUtc.toISOString(), '2026-11-06T10:00:00.000Z');
  assert.equal(localDays(7, 'Pacific/Honolulu', now).dates.at(-1), '2026-11-12');
  assert.equal(localDays(7, 'Asia/Kolkata', now).fromUtc.toISOString(), '2026-11-06T18:30:00.000Z');
});

test('daylight saving (E93): days follow the zone\'s offset on each day, not one fixed offset', () => {
  // New York leaves daylight saving on 1 Nov 2026 at 02:00 local (UTC−4 → UTC−5).
  assert.equal(offsetAt('America/New_York', Date.UTC(2026, 9, 31, 12)), -240);
  assert.equal(offsetAt('America/New_York', Date.UTC(2026, 10, 3, 12)), -300);
  // 23:30 local on 31 Oct (EDT) and 23:30 local on 1 Nov (EST) stay on their own dates.
  assert.equal(localDate('America/New_York', Date.UTC(2026, 10, 1, 3, 30)), '2026-10-31');
  assert.equal(localDate('America/New_York', Date.UTC(2026, 10, 2, 4, 30)), '2026-11-01');
  // A range that starts before the change begins at local midnight with the old offset.
  const ny = localDays(7, 'America/New_York', Date.UTC(2026, 10, 3, 12));
  assert.deepEqual([ny.dates[0], ny.dates.at(-1)], ['2026-10-28', '2026-11-03']);
  assert.equal(ny.fromUtc.toISOString(), '2026-10-28T04:00:00.000Z'); // 28 Oct 00:00 EDT
});

test('query validation: days 7|30, tz must be a known IANA zone', () => {
  assert.deepEqual(parseDashboardQuery({}), { days: 7, tz: 'UTC' });
  assert.deepEqual(parseDashboardQuery({ days: '30', tz: 'Asia/Dhaka' }), { days: 30, tz: 'Asia/Dhaka' });
  for (const query of [{ days: '14' }, { days: '7.0' }, { days: 'x' }, { tz: 'Mars/Olympus' }, { tz: '+06:00' }, { tz: 'Asia/Dhaka; DROP' }, { tz: ['UTC', 'UTC'] }, { tz: 'a'.repeat(65) }]) {
    assert.throws(() => parseDashboardQuery(query), (e) => e.status === 400, JSON.stringify(query));
  }
});

// ---------------------------------------------------------------- E92: timestamps are UTC

test('column defaults (CURRENT_TIMESTAMP) are stored in UTC, whatever the MySQL server zone', async () => {
  const { spaces } = await ownerWithSpaces(1);
  const [[row]] = await getPool().execute('SELECT created_at, @@session.time_zone AS tz FROM spaces WHERE id = ?', [spaces[0].id]);
  assert.equal(row.tz, '+00:00');
  const drift = Math.abs(row.created_at.getTime() - Date.now());
  assert.ok(drift < 2 * 60_000, `created_at is ${Math.round(drift / 60_000)} min away from now (expected UTC)`);
});

// ---------------------------------------------------------------- API

test('logged out → 401; bad query → 400 with field errors', async () => {
  assert.equal((await dashboard(new Client(app.baseUrl))).status, 401);
  const { client } = await ownerWithSpaces(0);
  const bad = await dashboard(client, '?days=14&tz=Nowhere%2FCity');
  assert.equal(bad.status, 400);
  assert.deepEqual(Object.keys(bad.body.fields).sort(), ['days', 'tz']);
});

test('a new owner sees zeros, an all-zero graph of the right length, and no activity', async () => {
  const { client } = await ownerWithSpaces(0);
  const res = await dashboard(client, '?days=30');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.totals, { spaces: 0, testimonials: 0, visible: 0, locked: 0, inPeriod: 0 });
  assert.equal(res.body.daily.length, 30);
  assert.ok(res.body.daily.every((d) => d.count === 0));
  assert.deepEqual(res.body.recent, []);
  assert.deepEqual(res.body.plan, { code: 'free', name: 'Free', maxSpaces: 3, maxVisiblePerSpace: 100 });
  // E93: the upgrade card's figures come from the plans table.
  assert.deepEqual(res.body.upgradeTo, { name: 'Paid', priceMinor: 99900, currency: 'BDT', interval: 'month', maxSpaces: 25, maxVisiblePerSpace: 1000 });
});

test('totals across spaces: locked per space by the accept-but-lock rule; hidden count as visible', async () => {
  const { client, spaces } = await ownerWithSpaces(2);
  await fill(spaces[0].id, 101); // 100 visible + 1 locked
  await addAt(spaces[1].id, [new Date()], { is_hidden: 1 }); // hidden still counts as visible
  const res = await dashboard(client);
  assert.deepEqual(
    { spaces: res.body.totals.spaces, testimonials: res.body.totals.testimonials, visible: res.body.totals.visible, locked: res.body.totals.locked },
    { spaces: 2, testimonials: 102, visible: 101, locked: 1 },
  );
});

test('owner isolation: another owner\'s spaces and testimonials are never counted or listed', async () => {
  const a = await ownerWithSpaces(1);
  await addAt(a.spaces[0].id, [new Date(), new Date()]);
  const b = await ownerWithSpaces(1);
  await addAt(b.spaces[0].id, [new Date()], { name: 'Only B' });

  const res = await dashboard(b.client);
  assert.equal(res.body.totals.spaces, 1);
  assert.equal(res.body.totals.testimonials, 1);
  assert.equal(res.body.totals.inPeriod, 1);
  const text = JSON.stringify(res.body.recent);
  assert.ok(res.body.recent.every((e) => e.spaceId === undefined || e.spaceId === b.spaces[0].id));
  assert.ok(text.includes('Only B'));
});

test('daily graph: zero-filled days, counts per local day, inPeriod is the sum', async () => {
  const { client, spaces } = await ownerWithSpaces(1);
  const now = Date.now();
  await addAt(spaces[0].id, [
    new Date(now - 60_000), new Date(now - 120_000), // today
    new Date(now - 2 * 86_400_000), // two days ago
    new Date(now - 40 * 86_400_000), // outside both ranges
  ]);
  const week = await dashboard(client, '?days=7&tz=UTC');
  assert.equal(week.body.daily.length, 7);
  assert.equal(week.body.daily.at(-1).date, new Date(now).toISOString().slice(0, 10));
  assert.equal(week.body.daily.at(-1).count, 2);
  assert.equal(week.body.daily.at(-3).count, 1);
  assert.equal(week.body.totals.inPeriod, 3);
  assert.equal(week.body.daily.reduce((s, d) => s + d.count, 0), 3);
  const month = await dashboard(client, '?days=30&tz=UTC');
  assert.equal(month.body.daily.length, 30);
  assert.equal(month.body.totals.inPeriod, 3, 'the 40-day-old one is outside 30 days');
});

test('time zone: 23:30 in Dhaka (17:30 UTC) counts on that Dhaka day, and 00:30 Dhaka on the next', async () => {
  const { client, spaces } = await ownerWithSpaces(1);
  // Yesterday (UTC date) at 17:30 UTC = 23:30 Dhaka the same date; at 18:30 UTC = 00:30 Dhaka the next date.
  const y = new Date(Date.now() - 86_400_000);
  const base = Date.UTC(y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate());
  await addAt(spaces[0].id, [new Date(base + (17 * 60 + 30) * 60_000), new Date(base + (18 * 60 + 30) * 60_000)]);
  const day = (ms) => new Date(ms).toISOString().slice(0, 10);

  const dhaka = await dashboard(client, '?days=7&tz=Asia%2FDhaka');
  const byDate = Object.fromEntries(dhaka.body.daily.map((d) => [d.date, d.count]));
  assert.equal(byDate[day(base)], 1, '23:30 Dhaka stays on its own date');
  assert.equal(byDate[day(base + 86_400_000)] ?? 0, 1, '00:30 Dhaka is the next date');

  const utc = await dashboard(client, '?days=7&tz=UTC');
  const utcByDate = Object.fromEntries(utc.body.daily.map((d) => [d.date, d.count]));
  assert.equal(utcByDate[day(base)], 2, 'in UTC both fall on the same date');
});

test('recent activity: newest first, at most 10, testimonials and spaces, with space ids for links', async () => {
  const { client, spaces } = await ownerWithSpaces(1);
  const now = Date.now();
  await addAt(spaces[0].id, Array.from({ length: 12 }, (_, i) => new Date(now + (i + 1) * 1000)));
  const res = await dashboard(client);
  assert.equal(res.body.recent.length, 10);
  assert.equal(res.body.recent[0].name, 'Customer 11');
  const times = res.body.recent.map((e) => Date.parse(e.at));
  assert.deepEqual(times, [...times].sort((x, y) => y - x));
  assert.ok(res.body.recent.every((e) => e.type === 'testimonial' && e.spaceId === spaces[0].id && e.spaceTitle === 'Space 1'));

  const fresh = await ownerWithSpaces(1);
  const created = await dashboard(fresh.client);
  assert.deepEqual(created.body.recent.map((e) => [e.type, e.spaceTitle]), [['space', 'Space 1']]);
});

test('recent activity: a locked testimonial is listed without its name; after an upgrade it shows', async () => {
  const { client, spaces, user } = await ownerWithSpaces(1);
  await fill(spaces[0].id, 100);
  // One second after the space was created, so the two events never share a timestamp (a same-
  // second tie sorts the space event first and made this test flaky).
  await addAt(spaces[0].id, [new Date(Date.now() + 1000)], { name: 'Secret Locked Name' });
  const res = await dashboard(client);
  const first = res.body.recent[0];
  assert.equal(first.type, 'testimonial');
  assert.equal(first.locked, true);
  assert.equal(first.name, null);
  assert.ok(!JSON.stringify(res.body).includes('Secret Locked Name'));
  const testimonialEvents = res.body.recent.filter((e) => e.type === 'testimonial');
  assert.equal(testimonialEvents[1].locked, false, 'the 100th (newest filler) is visible');
  assert.equal(testimonialEvents[1].name, 'Filler 99');

  await getPool().execute("UPDATE users SET plan_code = 'paid' WHERE id = ?", [user.id]);
  const paid = await dashboard(client);
  assert.equal(paid.body.recent[0].name, 'Secret Locked Name');
  assert.equal(paid.body.recent[0].locked, false);
  assert.equal(paid.body.plan.code, 'paid');
  assert.equal(paid.body.upgradeTo, null, 'nothing above Paid');
  assert.equal(paid.body.totals.locked, 0);
});

test('recent activity includes simulated upgrades (billing events, used from M7)', async () => {
  const { client, user } = await ownerWithSpaces(0);
  await getPool().query('INSERT INTO billing_events SET ?', [{
    user_id: user.id, event_type: 'upgrade_simulated', from_plan_code: 'free', to_plan_code: 'paid', amount_minor: 99900, currency: 'BDT',
  }]);
  const res = await dashboard(client);
  assert.equal(res.body.recent[0].type, 'upgrade');
  assert.equal(res.body.recent[0].planName, 'Paid');
});

test('space list exposes the per-space visible limit for the cards (E82)', async () => {
  const { client } = await ownerWithSpaces(1);
  const res = await client.get('/api/spaces');
  assert.equal(res.body.usage.maxVisiblePerSpace, 100);
});
