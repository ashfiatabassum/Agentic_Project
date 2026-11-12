// M3: public collection page, submission (FR-05, FR-06, FR-12 accept but lock / hard cap) and the
// owner inbox (FR-07), through the real API against testimonial_mvp_test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { closePool, getPool } from '../src/db.js';
import { Client, signedInOwner, startServer, validSpace } from './helpers/api.js';

let app;
let uploadsDir;
before(async () => {
  uploadsDir = await mkdtemp(path.join(os.tmpdir(), 'testimonial-uploads-'));
  process.env.UPLOADS_DIR = uploadsDir;
  app = await startServer({ rateLimits: { register: { max: 1000 }, submit: { max: 1000 }, submitAttempts: { max: 100000 } } });
});
after(async () => {
  await app.close();
  await closePool();
  await rm(uploadsDir, { recursive: true, force: true });
});

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

const customer = () => new Client(app.baseUrl); // no cookies: a logged-out visitor

/** Submits like the browser does: multipart with a JSON "data" part and an optional "photo". */
function submit(client, slug, data, { photo, photoName = 'me.png', photoType = 'image/png', rawData } = {}) {
  const form = new FormData();
  form.append('data', rawData ?? JSON.stringify(data));
  if (photo) form.append('photo', new Blob([photo], { type: photoType }), photoName);
  return client.request('POST', `/api/public/spaces/${slug}/testimonials`, { raw: { body: form } });
}

const goodSubmission = (overrides = {}) => ({
  name: 'Nadia Rahman',
  email: 'nadia@example.com',
  body: 'The sourdough is the best in town.',
  rating: 5,
  ...overrides,
});

async function ownerWithSpace(spaceOverrides = {}) {
  const owner = await signedInOwner(app.baseUrl);
  const res = await owner.client.post('/api/spaces', validSpace(spaceOverrides));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { ...owner, space: res.body.space };
}

const photoFiles = async () => {
  try {
    return await readdir(path.join(uploadsDir, 'photos'));
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------- public read (E21)

test('public space: display data only — no owner, email, counts, or plan', async () => {
  const { space } = await ownerWithSpace({ thankYouMessage: 'Thanks a lot!' });
  const res = await customer().get(`/api/public/spaces/${space.slug}`);
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.body.space).sort(), [
    'brandColor', 'fields', 'logoUrl', 'prompt', 'questions', 'slug', 'subtitle', 'themeCode', 'title',
  ]);
  assert.equal(res.body.space.questions.length, 2);
  assert.ok(!JSON.stringify(res.body).includes('owner'), 'no owner data');
  assert.equal((await customer().get('/api/public/spaces/no-such-space')).status, 404);
});

// ---------------------------------------------------------------- submission (E22–E24)

test('valid submission without a login: 201 with the thank-you message; consents default to false', async () => {
  const { space, client: owner } = await ownerWithSpace({ thankYouMessage: 'Thanks a lot!' });
  const res = await submit(customer(), space.slug, goodSubmission({ jobTitle: 'Café owner' }));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.deepEqual(res.body, { thankYouMessage: 'Thanks a lot!' });

  const [[row]] = await getPool().execute('SELECT * FROM testimonials WHERE space_id = ?', [space.id]);
  assert.equal(row.email, 'nadia@example.com');
  assert.equal(row.job_title, 'Café owner');
  assert.equal(row.consent_public, 0);
  assert.equal(row.consent_social, 0);
  assert.equal(row.rating, 5);

  const inbox = await owner.get(`/api/spaces/${space.id}/testimonials`);
  assert.equal(inbox.body.testimonials.length, 1);
});

test('default thank-you message when the space has none', async () => {
  const { space } = await ownerWithSpace({ thankYouMessage: '' });
  const res = await submit(customer(), space.slug, goodSubmission());
  assert.equal(res.body.thankYouMessage, 'Thank you! Your testimonial has been sent.');
});

test('field modes: required fields enforced, optional checked when filled, off fields ignored', async () => {
  const { space } = await ownerWithSpace({
    fields: { jobTitle: 'required', company: 'off', socialLink: 'optional', photo: 'off', rating: 'required' },
  });
  const missing = await submit(customer(), space.slug, { email: 'bad' });
  assert.equal(missing.status, 400);
  assert.deepEqual(Object.keys(missing.body.fields).sort(), ['body', 'email', 'jobTitle', 'name', 'rating']);

  const badLink = await submit(customer(), space.slug, goodSubmission({ jobTitle: 'Chef', socialLink: 'javascript:alert(1)' }));
  assert.equal(badLink.status, 400);
  assert.match(badLink.body.fields.socialLink, /http/);

  const badRating = await submit(customer(), space.slug, goodSubmission({ jobTitle: 'Chef', rating: 6 }));
  assert.equal(badRating.status, 400);

  const ok = await submit(customer(), space.slug, goodSubmission({ jobTitle: 'Chef', company: 'Ignored Inc', socialLink: 'https://example.com/me', consentPublic: true }));
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  const [[row]] = await getPool().execute('SELECT company, social_link, consent_public FROM testimonials WHERE space_id = ?', [space.id]);
  assert.deepEqual(row, { company: '', social_link: 'https://example.com/me', consent_public: 1 });
});

test('answers: optional, only for active questions, stored with the question text', async () => {
  const { space } = await ownerWithSpace();
  const [q1, q2] = space.questions;
  const ok = await submit(customer(), space.slug, goodSubmission({ answers: [{ questionId: q1.id, text: 'Croissants' }, { questionId: q2.id, text: '' }] }));
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  const [answers] = await getPool().execute(
    'SELECT a.question_snapshot, a.answer_text FROM testimonial_answers a JOIN testimonials t ON t.id = a.testimonial_id WHERE t.space_id = ?', [space.id]);
  assert.deepEqual(answers, [{ question_snapshot: q1.text, answer_text: 'Croissants' }]); // the empty answer is skipped

  const foreign = await submit(customer(), space.slug, goodSubmission({ answers: [{ questionId: 999999, text: 'x' }] }));
  assert.equal(foreign.status, 400);
  assert.ok(foreign.body.fields.answers);
});

test('photo: required when configured; checked by content; 2 MB limit; files cleaned up on rejection', async () => {
  const { space } = await ownerWithSpace({ fields: { jobTitle: 'off', company: 'off', socialLink: 'off', photo: 'required', rating: 'off' } });
  const before = (await photoFiles()).length;

  const none = await submit(customer(), space.slug, goodSubmission({ rating: undefined }));
  assert.equal(none.status, 400);
  assert.ok(none.body.fields.photo);

  const fake = await submit(customer(), space.slug, goodSubmission({ rating: undefined }), { photo: Buffer.from('<svg onload=alert(1)>'.padEnd(64)) });
  assert.equal(fake.status, 400);
  assert.match(fake.body.fields.photo, /JPEG, PNG, or WebP/);

  const big = await submit(customer(), space.slug, goodSubmission({ rating: undefined }), { photo: Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]) });
  assert.equal(big.status, 400);
  assert.match(big.body.fields.photo, /2 MB/);

  // A valid photo with otherwise invalid data is saved first, then deleted again.
  const invalidWithPhoto = await submit(customer(), space.slug, { name: '', email: 'x@example.com', body: 'Hi' }, { photo: PNG });
  assert.equal(invalidWithPhoto.status, 400);
  assert.equal((await photoFiles()).length, before, 'no orphan photo files');

  const ok = await submit(customer(), space.slug, goodSubmission({ rating: undefined }), { photo: PNG });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  const [[row]] = await getPool().execute('SELECT photo_path FROM testimonials WHERE space_id = ?', [space.id]);
  assert.match(row.photo_path, /^photos\/[0-9a-f]{32}\.png$/);
  assert.ok(existsSync(path.join(uploadsDir, ...row.photo_path.split('/'))));
});

test('a photo sent to a space that does not collect photos is not kept', async () => {
  const { space } = await ownerWithSpace(); // photo: off
  const before = (await photoFiles()).length;
  const res = await submit(customer(), space.slug, goodSubmission(), { photo: PNG });
  assert.equal(res.status, 201);
  const [[row]] = await getPool().execute('SELECT photo_path FROM testimonials WHERE space_id = ?', [space.id]);
  assert.equal(row.photo_path, null);
  assert.equal((await photoFiles()).length, before);
});

test('malformed form data and unknown pages are rejected', async () => {
  const { space } = await ownerWithSpace();
  assert.equal((await submit(customer(), space.slug, null, { rawData: '{not json' })).status, 400);
  assert.equal((await submit(customer(), 'no-such-space', goodSubmission())).status, 404);
  const asJson = await customer().post(`/api/public/spaces/${space.slug}/testimonials`, goodSubmission());
  assert.equal(asJson.status, 400, 'JSON body without multipart has no data part');
});

// ---------------------------------------------------------------- accept but lock and hard cap (E24)

async function fillSpace(spaceId, n, { startDaysAgo = 400 } = {}) {
  const rows = Array.from({ length: n }, (_, i) => [spaceId, `Filler ${i}`, 'f@example.com', `filler ${i}`, startDaysAgo - i / 10]);
  await getPool().query(
    'INSERT INTO testimonials (space_id, name, email, body, created_at) VALUES ' +
      rows.map(() => '(?, ?, ?, ?, UTC_TIMESTAMP() - INTERVAL ? DAY)').join(', '),
    rows.flat(),
  );
}

test('Free plan: the 101st testimonial is saved but locked; inbox shows 100 and a locked count', async () => {
  const { space, client: owner } = await ownerWithSpace();
  await fillSpace(space.id, 100);
  const res = await submit(customer(), space.slug, goodSubmission({ name: 'Number 101' }));
  assert.equal(res.status, 201, 'customer still gets the thank-you');

  const inbox = await owner.get(`/api/spaces/${space.id}/testimonials`);
  assert.deepEqual(inbox.body.counts, { visible: 100, locked: 1, total: 101 });
  assert.equal(inbox.body.testimonials.length, 100);
  assert.ok(!inbox.body.testimonials.some((t) => t.name === 'Number 101'), 'the newest one is the locked one');

  const [[locked]] = await getPool().execute('SELECT id FROM testimonials WHERE space_id = ? AND name = ?', [space.id, 'Number 101']);
  const detail = await owner.get(`/api/spaces/${space.id}/testimonials/${locked.id}`);
  assert.equal(detail.status, 403);
  assert.equal(detail.body.locked, true);
  assert.equal(detail.body.name, undefined, 'no content for a locked testimonial');

  const dashboard = await owner.get('/api/spaces');
  const card = dashboard.body.spaces.find((s) => s.id === space.id);
  assert.equal(card.testimonialCount, 101);
  assert.equal(card.lockedCount, 1);
});

test('upgrading (plan change) unlocks: all testimonials become visible', async () => {
  const { space, client: owner, user } = await ownerWithSpace();
  await fillSpace(space.id, 101);
  await getPool().execute("UPDATE users SET plan_code = 'paid' WHERE id = ?", [user.id]);
  const inbox = await owner.get(`/api/spaces/${space.id}/testimonials`);
  assert.deepEqual(inbox.body.counts, { visible: 101, locked: 0, total: 101 });
});

test('the 1,001st submission is refused politely and its photo is not kept', async () => {
  const { space } = await ownerWithSpace({ fields: { jobTitle: 'off', company: 'off', socialLink: 'off', photo: 'optional', rating: 'off' } });
  await fillSpace(space.id, 1000);
  const before = (await photoFiles()).length;
  const res = await submit(customer(), space.slug, goodSubmission({ rating: undefined }), { photo: PNG });
  assert.equal(res.status, 403);
  assert.match(res.body.error, /isn't accepting testimonials/);
  assert.equal((await photoFiles()).length, before);
});

// ---------------------------------------------------------------- rate limit (E25)

test('rate limit: 5 submissions per device per space per 10 minutes, then 429 with Retry-After', async () => {
  const limited = await startServer({ rateLimits: { register: { max: 1000 } } }); // default submit limit
  try {
    const owner = await signedInOwner(limited.baseUrl);
    const { body } = await owner.client.post('/api/spaces', validSpace());
    const visitor = new Client(limited.baseUrl);
    const invalid = await submit(visitor, body.space.slug, { name: '' });
    assert.equal(invalid.status, 400, 'invalid attempts do not count');
    for (let i = 0; i < 5; i += 1) assert.equal((await submit(visitor, body.space.slug, goodSubmission())).status, 201);
    const sixth = await submit(visitor, body.space.slug, goodSubmission());
    assert.equal(sixth.status, 429);
    assert.ok(Number(sixth.headers.get('retry-after')) > 0);
  } finally {
    await limited.close();
  }
});

// ---------------------------------------------------------------- inbox (E28–E30)

async function seedInbox(spaceId) {
  const insert = (o) => getPool().query('INSERT INTO testimonials SET ?', [{ space_id: spaceId, email: 'c@example.com', ...o }]);
  await insert({ name: 'Old Favourite', body: 'Lovely bread', is_favorite: 1, consent_public: 1, on_wall: 1, created_at: new Date(Date.now() - 5 * 864e5) });
  await insert({ name: 'Newest', company: '100% Bakes', body: 'Great service', created_at: new Date(Date.now() - 1 * 864e5) });
  await insert({ name: 'Hidden One', body: 'spam_link here', is_hidden: 1, created_at: new Date(Date.now() - 3 * 864e5) });
  await insert({ name: 'Middle', body: 'Nice', consent_public: 1, created_at: new Date(Date.now() - 2 * 864e5) });
}

test('inbox order: favourites first, then newest', async () => {
  const { space, client: owner } = await ownerWithSpace();
  await seedInbox(space.id);
  const res = await owner.get(`/api/spaces/${space.id}/testimonials`);
  assert.deepEqual(res.body.testimonials.map((t) => t.name), ['Old Favourite', 'Newest', 'Middle', 'Hidden One']);
  assert.equal(res.body.space.title, space.title);
});

test('inbox filters and search (wildcards are literal)', async () => {
  const { space, client: owner } = await ownerWithSpace();
  await seedInbox(space.id);
  const names = async (qs) => (await owner.get(`/api/spaces/${space.id}/testimonials?${qs}`)).body.testimonials.map((t) => t.name);
  assert.deepEqual(await names('filter=favorites'), ['Old Favourite']);
  assert.deepEqual(await names('filter=on_wall'), ['Old Favourite']);
  assert.deepEqual(await names('filter=hidden'), ['Hidden One']);
  assert.deepEqual(await names('filter=public'), ['Old Favourite', 'Middle']);
  assert.deepEqual(await names('q=bread'), ['Old Favourite']);
  assert.deepEqual(await names(`q=${encodeURIComponent('100%')}`), ['Newest']);
  assert.deepEqual(await names('q=%25'), ['Newest'], '"%" matches only a literal percent sign');
  assert.deepEqual(await names('q=_'), ['Hidden One'], '"_" matches only a literal underscore');
  assert.equal((await owner.get(`/api/spaces/${space.id}/testimonials?filter=bogus`)).status, 400);
});

test('detail shows everything the owner needs, including answers and consents', async () => {
  const { space, client: owner } = await ownerWithSpace({ fields: { jobTitle: 'optional', company: 'optional', socialLink: 'optional', photo: 'optional', rating: 'required' } });
  const q = space.questions[0];
  await submit(customer(), space.slug, goodSubmission({
    jobTitle: 'Owner', company: 'Brew & Co', socialLink: 'https://example.com', consentPublic: true,
    answers: [{ questionId: q.id, text: 'Bread' }],
  }), { photo: PNG });
  const list = await owner.get(`/api/spaces/${space.id}/testimonials`);
  const id = list.body.testimonials[0].id;
  assert.equal(list.body.testimonials[0].email, undefined, 'the list does not include email');

  const res = await owner.get(`/api/spaces/${space.id}/testimonials/${id}`);
  assert.equal(res.status, 200);
  const t = res.body.testimonial;
  assert.equal(t.email, 'nadia@example.com');
  assert.equal(t.company, 'Brew & Co');
  assert.equal(t.consentPublic, true);
  assert.equal(t.consentSocial, false);
  assert.match(t.photoUrl, /^\/uploads\/photos\//);
  assert.deepEqual(t.answers, [{ question: q.text, answer: 'Bread' }]);
});

test('owner isolation: another owner gets 404 on the inbox and on a testimonial', async () => {
  const a = await ownerWithSpace();
  await submit(customer(), a.space.slug, goodSubmission());
  const [[row]] = await getPool().execute('SELECT id FROM testimonials WHERE space_id = ?', [a.space.id]);
  const b = await signedInOwner(app.baseUrl);
  assert.equal((await b.client.get(`/api/spaces/${a.space.id}/testimonials`)).status, 404);
  assert.equal((await b.client.get(`/api/spaces/${a.space.id}/testimonials/${row.id}`)).status, 404);
  assert.equal((await customer().get(`/api/spaces/${a.space.id}/testimonials`)).status, 401);
});

// ---------------------------------------------------------------- review fixes (E34–E35) and coverage gaps

test('E34: padded, uppercase, and non-ASCII slugs are 404 (no 500, no rate-limit bypass)', async () => {
  const { space } = await ownerWithSpace();
  for (const slug of [`${space.slug}%20`, `${space.slug}%20%20%20`, space.slug.toUpperCase(), '%C3%A9t%C3%A9', '%F0%9F%98%80']) {
    assert.equal((await customer().get(`/api/public/spaces/${slug}`)).status, 404, `GET ${slug}`);
    assert.equal((await submit(customer(), slug, goodSubmission())).status, 404, `POST ${slug}`);
  }
});

test('E35: invalid attempts are capped per IP (30 / 10 min) even though they do not use the per-space allowance', async () => {
  const limited = await startServer({ rateLimits: { register: { max: 1000 } } }); // default limits
  try {
    const owner = await signedInOwner(limited.baseUrl);
    const { body } = await owner.client.post('/api/spaces', validSpace());
    const visitor = new Client(limited.baseUrl);
    const statuses = [];
    for (let i = 0; i < 31; i += 1) statuses.push((await submit(visitor, body.space.slug, { name: '' }, { photo: PNG })).status);
    assert.deepEqual([...new Set(statuses.slice(0, 30))], [400], 'the first 30 invalid attempts are rejected as invalid');
    assert.equal(statuses[30], 429, 'the 31st attempt is rate limited');
  } finally {
    await limited.close();
  }
});

test('invalid data with a valid photo writes no file at all (validation happens before saving)', async () => {
  const { space } = await ownerWithSpace({ fields: { jobTitle: 'off', company: 'off', socialLink: 'off', photo: 'optional', rating: 'off' } });
  const before = await photoFiles();
  const res = await submit(customer(), space.slug, { name: '', email: 'x@example.com', body: 'Hi' }, { photo: PNG });
  assert.equal(res.status, 400);
  assert.deepEqual(await photoFiles(), before);
});

test('photo field off: even a non-image "photo" is ignored and the testimonial is saved', async () => {
  const { space } = await ownerWithSpace(); // photo: off
  const res = await submit(customer(), space.slug, goodSubmission(), { photo: Buffer.from('not an image at all, just text'.padEnd(64)) });
  assert.equal(res.status, 201, JSON.stringify(res.body));
});

test('the per-space limit is separate for each space', async () => {
  const limited = await startServer({ rateLimits: { register: { max: 1000 } } });
  try {
    const owner = await signedInOwner(limited.baseUrl);
    const one = (await owner.client.post('/api/spaces', validSpace())).body.space;
    const two = (await owner.client.post('/api/spaces', validSpace())).body.space;
    const visitor = new Client(limited.baseUrl);
    for (let i = 0; i < 5; i += 1) await submit(visitor, one.slug, goodSubmission());
    assert.equal((await submit(visitor, one.slug, goodSubmission())).status, 429);
    assert.equal((await submit(visitor, two.slug, goodSubmission())).status, 201, 'another space still accepts');
  } finally {
    await limited.close();
  }
});

test('an oversized upload gives back the per-space allowance', async () => {
  const limited = await startServer({ rateLimits: { register: { max: 1000 } } });
  try {
    const owner = await signedInOwner(limited.baseUrl);
    const { body } = await owner.client.post('/api/spaces', validSpace({ fields: { jobTitle: 'off', company: 'off', socialLink: 'off', photo: 'optional', rating: 'off' } }));
    const visitor = new Client(limited.baseUrl);
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await submit(visitor, body.space.slug, goodSubmission({ rating: undefined }), { photo: Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]) })).status, 400);
    }
    assert.equal((await submit(visitor, body.space.slug, goodSubmission({ rating: undefined }))).status, 201);
  } finally {
    await limited.close();
  }
});

test('answers: deactivated, foreign, and duplicate question ids are rejected; long answers too', async () => {
  const { space, client: owner } = await ownerWithSpace();
  const other = await ownerWithSpace();
  const [q1, q2] = space.questions;
  // Answer q1 once so that removing it deactivates it (D4) instead of deleting it.
  await submit(customer(), space.slug, goodSubmission({ answers: [{ questionId: q1.id, text: 'yes' }] }));
  const updated = await owner.put(`/api/spaces/${space.id}`, validSpace({ slug: space.slug, questions: [{ id: q2.id, text: q2.text }] }));
  assert.equal(updated.status, 200, JSON.stringify(updated.body));

  const publicSpace = (await customer().get(`/api/public/spaces/${space.slug}`)).body.space;
  assert.deepEqual(publicSpace.questions.map((q) => q.id), [q2.id], 'inactive questions are not shown publicly');

  for (const answers of [
    [{ questionId: q1.id, text: 'deactivated' }],
    [{ questionId: other.space.questions[0].id, text: 'foreign' }],
    [{ questionId: q2.id, text: 'a' }, { questionId: q2.id, text: 'b' }],
  ]) {
    const res = await submit(customer(), space.slug, goodSubmission({ answers }));
    assert.equal(res.status, 400, JSON.stringify(answers));
  }
  const long = await submit(customer(), space.slug, goodSubmission({ answers: [{ questionId: q2.id, text: 'x'.repeat(1001) }] }));
  assert.equal(long.status, 400);
  assert.ok(long.body.fields[`answers.${q2.id}`]);
});

test('optional text fields may be left empty', async () => {
  const { space } = await ownerWithSpace({ fields: { jobTitle: 'optional', company: 'optional', socialLink: 'optional', photo: 'off', rating: 'optional' } });
  const res = await submit(customer(), space.slug, goodSubmission({ rating: undefined, jobTitle: '', company: '  ', socialLink: '' }));
  assert.equal(res.status, 201, JSON.stringify(res.body));
});

test('owner B with their own space id and owner A\'s testimonial id gets 404', async () => {
  const a = await ownerWithSpace();
  await submit(customer(), a.space.slug, goodSubmission());
  const [[row]] = await getPool().execute('SELECT id FROM testimonials WHERE space_id = ?', [a.space.id]);
  const b = await ownerWithSpace();
  assert.equal((await b.client.get(`/api/spaces/${b.space.id}/testimonials/${row.id}`)).status, 404);
});

test('hidden testimonials count toward the plan limit (hiding does not free capacity)', async () => {
  const { space, client: owner } = await ownerWithSpace();
  await fillSpace(space.id, 100);
  await getPool().execute('UPDATE testimonials SET is_hidden = 1 WHERE space_id = ? LIMIT 50', [space.id]);
  await submit(customer(), space.slug, goodSubmission());
  const inbox = await owner.get(`/api/spaces/${space.id}/testimonials`);
  assert.deepEqual(inbox.body.counts, { visible: 100, locked: 1, total: 101 });
});
