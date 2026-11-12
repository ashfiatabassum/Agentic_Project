// FR-02 – FR-04 and the FR-12 space limit, through the real API, against testimonial_mvp_test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { closePool, getPool } from '../src/db.js';
import { Client, signedInOwner, startServer, validSpace } from './helpers/api.js';
import { createTestimonial } from './helpers/db.js';

let app;
let uploadsDir;
before(async () => {
  uploadsDir = await mkdtemp(path.join(os.tmpdir(), 'testimonial-uploads-'));
  process.env.UPLOADS_DIR = uploadsDir;
  app = await startServer({ rateLimits: { register: { max: 1000 } } });
});
after(async () => {
  await app.close();
  await closePool();
  await rm(uploadsDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------- tiny valid images (magic bytes + padding)
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(32)]);

function uploadLogo(client, spaceId, buffer, { filename = 'logo.png', type = 'image/png', header = true } = {}) {
  const form = new FormData();
  form.append('logo', new Blob([buffer], { type }), filename);
  const headers = header ? { 'x-requested-with': 'fetch' } : {};
  return client.request('POST', `/api/spaces/${spaceId}/logo`, { raw: { body: form, headers } });
}

const storedFile = (logoUrl) => path.join(uploadsDir, ...logoUrl.replace(/^\/uploads\//, '').split('/'));

// ---------------------------------------------------------------- auth

test('space endpoints require a session', async () => {
  const anon = new Client(app.baseUrl);
  for (const [method, url] of [['GET', '/api/spaces'], ['POST', '/api/spaces'], ['GET', '/api/spaces/1'],
    ['PUT', '/api/spaces/1'], ['DELETE', '/api/spaces/1'], ['GET', '/api/spaces/slug-available?slug=abc'],
    ['DELETE', '/api/spaces/1/logo']]) {
    const res = await anon.request(method, url, { json: method === 'GET' ? undefined : {} });
    assert.equal(res.status, 401, `${method} ${url}`);
  }
});

test('GET /api/themes lists the predefined themes', async () => {
  const res = await new Client(app.baseUrl).get('/api/themes');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.themes.map((t) => t.code), ['light', 'dark', 'warm']);
});

// ---------------------------------------------------------------- CRUD

test('create, read, list, update, and delete a space', async () => {
  const { client } = await signedInOwner(app.baseUrl);
  const input = validSpace({ thankYouMessage: 'Thanks!' });

  const created = await client.post('/api/spaces', input);
  assert.equal(created.status, 201);
  const space = created.body.space;
  assert.equal(space.title, 'Acme Bakery');
  assert.equal(space.slug, input.slug);
  assert.equal(space.brandColor, '#4F46E5');
  assert.equal(space.thankYouMessage, 'Thanks!');
  assert.deepEqual(space.fields, { jobTitle: 'optional', company: 'off', socialLink: 'off', photo: 'off', rating: 'required' });
  assert.deepEqual(space.questions.map((q) => q.text), ['What did you buy?', 'Would you recommend us?']);
  assert.equal(space.logoUrl, null);
  assert.equal(space.testimonialCount, 0);

  const list = await client.get('/api/spaces');
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.spaces.map((s) => s.id), [space.id]);
  assert.deepEqual(list.body.usage, { plan: 'free', planName: 'Free', spacesUsed: 1, spacesMax: 3, maxVisiblePerSpace: 100 });

  const updated = await client.put(`/api/spaces/${space.id}`, {
    ...input, title: 'Acme Bakery & Café', themeCode: 'warm', fields: { ...input.fields, company: 'required' },
    questions: [{ id: space.questions[1].id, text: 'Recommend us?' }, { id: space.questions[0].id, text: 'What did you buy?' }],
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.space.title, 'Acme Bakery & Café');
  assert.equal(updated.body.space.themeCode, 'warm');
  assert.equal(updated.body.space.fields.company, 'required');
  assert.deepEqual(updated.body.space.questions, [
    { id: space.questions[1].id, text: 'Recommend us?' },
    { id: space.questions[0].id, text: 'What did you buy?' },
  ]);

  const deleted = await client.delete(`/api/spaces/${space.id}`);
  assert.equal(deleted.status, 204);
  assert.equal((await client.get(`/api/spaces/${space.id}`)).status, 404);
});

test('space input is validated on the server', async () => {
  const { client } = await signedInOwner(app.baseUrl);
  const res = await client.post('/api/spaces', {
    title: '', prompt: ' ', slug: 'Bad Slug', themeCode: 'neon', brandColor: 'red', subtitle: 'x'.repeat(201),
    fields: { jobTitle: 'sometimes' }, questions: [{ text: '' }],
  });
  assert.equal(res.status, 400);
  assert.deepEqual(Object.keys(res.body.fields).sort(),
    ['brandColor', 'fields.jobTitle', 'prompt', 'questions.0', 'slug', 'subtitle', 'themeCode', 'title']);

  const tooMany = await client.post('/api/spaces', validSpace({ questions: Array.from({ length: 6 }, (_, i) => ({ text: `Q${i}` })) }));
  assert.equal(tooMany.status, 400);
  assert.ok(tooMany.body.fields.questions);

  for (const slug of ['ab', 'a--b', '-ab', 'ab-', 'a'.repeat(61), 'ábc']) {
    const bad = await client.post('/api/spaces', validSpace({ slug }));
    assert.equal(bad.status, 400, slug);
    assert.ok(bad.body.fields.slug, slug);
  }
});

test('the slug is unique across all owners, and availability suggests -2, -3', async () => {
  const a = await signedInOwner(app.baseUrl);
  const b = await signedInOwner(app.baseUrl);
  const input = validSpace();
  const first = await a.client.post('/api/spaces', input);
  assert.equal(first.status, 201);

  const dup = await b.client.post('/api/spaces', validSpace({ slug: input.slug }));
  assert.equal(dup.status, 409);
  assert.equal(dup.body.fields.slug, 'This link is already taken');

  const check = await b.client.get(`/api/spaces/slug-available?slug=${input.slug}`);
  assert.deepEqual(check.body, { available: false, suggestion: `${input.slug}-2` });
  await b.client.post('/api/spaces', validSpace({ slug: `${input.slug}-2` }));
  const again = await b.client.get(`/api/spaces/slug-available?slug=${input.slug}`);
  assert.equal(again.body.suggestion, `${input.slug}-3`);

  // Editing your own space: its current slug counts as available — but not for another owner.
  const own = await a.client.get(`/api/spaces/slug-available?slug=${input.slug}&spaceId=${first.body.space.id}`);
  assert.deepEqual(own.body, { available: true });
  const other = await b.client.get(`/api/spaces/slug-available?slug=${input.slug}&spaceId=${first.body.space.id}`);
  assert.equal(other.body.available, false);

  // Changing my other space's slug to a taken one is a 409 too, and nothing changes.
  const mine2 = (await b.client.get('/api/spaces')).body.spaces[0];
  const full = (await b.client.get(`/api/spaces/${mine2.id}`)).body.space;
  const clash = await b.client.put(`/api/spaces/${mine2.id}`, { ...validSpace(), slug: input.slug, questions: [] });
  assert.equal(clash.status, 409);
  assert.equal(clash.body.fields.slug, 'This link is already taken');
  assert.equal((await b.client.get(`/api/spaces/${mine2.id}`)).body.space.slug, full.slug);

  const invalid = await a.client.get('/api/spaces/slug-available?slug=No!');
  assert.equal(invalid.body.available, false);
  assert.ok(invalid.body.error);
});

test('questions diff: unanswered removed questions are deleted, answered ones deactivated', async () => {
  const { client } = await signedInOwner(app.baseUrl);
  const input = validSpace({ questions: [{ text: 'Q1' }, { text: 'Q2' }, { text: 'Q3' }] });
  const { space } = (await client.post('/api/spaces', input)).body;
  const [q1, q2, q3] = space.questions;

  // Someone answered Q2.
  const pool = getPool();
  const testimonialId = await createTestimonial(pool, space.id);
  await pool.execute(
    'INSERT INTO testimonial_answers (testimonial_id, question_id, question_snapshot, answer_text, position) VALUES (?, ?, ?, ?, 1)',
    [testimonialId, q2.id, 'Q2', 'An answer']);

  const res = await client.put(`/api/spaces/${space.id}`, { ...input, questions: [{ id: q3.id, text: 'Q3 edited' }, { text: 'Q4' }] });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.space.questions.map((q) => q.text), ['Q3 edited', 'Q4']);

  const [rows] = await pool.execute('SELECT id, is_active FROM space_questions WHERE space_id = ? ORDER BY id', [space.id]);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r.is_active]));
  assert.equal(byId[q1.id], undefined, 'unanswered Q1 deleted');
  assert.equal(byId[q2.id], 0, 'answered Q2 kept but inactive');
  assert.equal(byId[q3.id], 1);
  assert.equal(rows.length, 3); // Q2 (inactive), Q3, Q4

  // The old answer still has its question text.
  const [[answer]] = await pool.execute('SELECT question_id, question_snapshot FROM testimonial_answers WHERE testimonial_id = ?', [testimonialId]);
  assert.deepEqual(answer, { question_id: q2.id, question_snapshot: 'Q2' });

  // An id from another space (or a deactivated one) is refused.
  const stale = await client.put(`/api/spaces/${space.id}`, { ...input, questions: [{ id: q2.id, text: 'revive' }] });
  assert.equal(stale.status, 400);
  assert.ok(stale.body.fields['questions.0']);
});

// ---------------------------------------------------------------- owner isolation

test('another owner gets 404 for every endpoint of my space', async () => {
  const a = await signedInOwner(app.baseUrl);
  const b = await signedInOwner(app.baseUrl);
  const input = validSpace();
  const { space } = (await a.client.post('/api/spaces', input)).body;
  await uploadLogo(a.client, space.id, PNG);

  assert.equal((await b.client.get(`/api/spaces/${space.id}`)).status, 404);
  assert.equal((await b.client.put(`/api/spaces/${space.id}`, { ...input, title: 'Hacked' })).status, 404);
  assert.equal((await b.client.put(`/api/spaces/${space.id}`, {})).status, 404, 'no validation details leak');
  assert.equal((await b.client.delete(`/api/spaces/${space.id}`)).status, 404);
  assert.equal((await uploadLogo(b.client, space.id, JPEG)).status, 404);
  assert.equal((await b.client.delete(`/api/spaces/${space.id}/logo`)).status, 404);
  assert.deepEqual((await b.client.get('/api/spaces')).body.spaces, []);

  // Nothing changed for A.
  const mine = (await a.client.get(`/api/spaces/${space.id}`)).body.space;
  assert.equal(mine.title, input.title);
  assert.match(mine.logoUrl, /^\/uploads\/logos\/[0-9a-f]{32}\.png$/);

  for (const bad of ['abc', '0', '-1', '1.5', '99999999999999999999']) {
    assert.equal((await a.client.get(`/api/spaces/${bad}`)).status, 404, bad);
  }
});

// ---------------------------------------------------------------- limit

test('Free owners cannot create a 4th space, even with 4 concurrent requests', async () => {
  const { client, user } = await signedInOwner(app.baseUrl);
  assert.equal((await client.post('/api/spaces', validSpace())).status, 201);

  const results = await Promise.all(Array.from({ length: 4 }, () => client.post('/api/spaces', validSpace())));
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [201, 201, 403, 403]);
  assert.equal(results.find((r) => r.status === 403).body.error, 'Your Free plan allows 3 spaces. Delete a space to make room.');

  const [[{ n }]] = await getPool().execute('SELECT COUNT(*) AS n FROM spaces WHERE owner_id = ?', [user.id]);
  assert.equal(Number(n), 3);

  // Paid owners get 25 (the limit comes from the database, not the client).
  await getPool().execute("UPDATE users SET plan_code = 'paid' WHERE id = ?", [user.id]);
  assert.equal((await client.post('/api/spaces', validSpace())).status, 201);
});

// ---------------------------------------------------------------- logo

test('logo upload checks type by content and size, replaces and removes files', async () => {
  const { client } = await signedInOwner(app.baseUrl);
  const { space } = (await client.post('/api/spaces', validSpace())).body;

  const fake = await uploadLogo(client, space.id, Buffer.from('<svg onload="alert(1)"></svg>'.padEnd(64)), { filename: 'logo.png', type: 'image/png' });
  assert.equal(fake.status, 400);
  assert.match(fake.body.fields.logo, /JPEG, PNG, or WebP/);

  const big = await uploadLogo(client, space.id, Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]));
  assert.equal(big.status, 400);
  assert.match(big.body.fields.logo, /2 MB/);

  const noHeader = await uploadLogo(client, space.id, PNG, { header: false });
  assert.equal(noHeader.status, 403);

  const first = await uploadLogo(client, space.id, PNG);
  assert.equal(first.status, 200);
  assert.match(first.body.logoUrl, /^\/uploads\/logos\/[0-9a-f]{32}\.png$/);
  assert.ok(existsSync(storedFile(first.body.logoUrl)));

  // Served read-only with nosniff.
  const served = await fetch(app.baseUrl + first.body.logoUrl);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');

  // A JPEG under a misleading name is stored as .jpg; the old file is deleted.
  const second = await uploadLogo(client, space.id, JPEG, { filename: 'logo.gif', type: 'image/gif' });
  assert.equal(second.status, 200);
  assert.match(second.body.logoUrl, /\.jpg$/);
  assert.equal(existsSync(storedFile(first.body.logoUrl)), false);
  assert.ok(existsSync(storedFile(second.body.logoUrl)));

  const webp = await uploadLogo(client, space.id, WEBP, { filename: 'logo', type: 'application/octet-stream' });
  assert.equal(webp.status, 200);
  assert.match(webp.body.logoUrl, /\.webp$/);
  assert.equal(existsSync(storedFile(second.body.logoUrl)), false);

  const removed = await client.delete(`/api/spaces/${space.id}/logo`);
  assert.equal(removed.status, 204);
  assert.equal(existsSync(storedFile(webp.body.logoUrl)), false);
  assert.equal((await client.get(`/api/spaces/${space.id}`)).body.space.logoUrl, null);
});

test('deleting a space deletes its testimonials and logo file', async () => {
  const { client } = await signedInOwner(app.baseUrl);
  const { space } = (await client.post('/api/spaces', validSpace())).body;
  const logo = (await uploadLogo(client, space.id, PNG)).body.logoUrl;
  await createTestimonial(getPool(), space.id);
  assert.equal((await client.get(`/api/spaces/${space.id}`)).body.space.testimonialCount, 1);

  assert.equal((await client.delete(`/api/spaces/${space.id}`)).status, 204);
  assert.equal(existsSync(storedFile(logo)), false);
  const [[{ n }]] = await getPool().execute('SELECT COUNT(*) AS n FROM testimonials WHERE space_id = ?', [space.id]);
  assert.equal(Number(n), 0);
});
