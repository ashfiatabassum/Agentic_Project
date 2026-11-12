// M4: moderation (FR-08: edit, hide, favourite, wall, delete) and the public Wall of Love (FR-09),
// through the real API against testimonial_mvp_test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { closePool, getPool } from '../src/db.js';
import { Client, signedInOwner, startServer, validSpace } from './helpers/api.js';

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

const customer = () => new Client(app.baseUrl);
const patch = (client, url, json) => client.request('PATCH', url, { json });

async function ownerWithSpace(spaceOverrides = {}) {
  const owner = await signedInOwner(app.baseUrl);
  const res = await owner.client.post('/api/spaces', validSpace(spaceOverrides));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { ...owner, space: res.body.space };
}

/** Inserts a testimonial directly (E52) and returns its id. */
async function addTestimonial(spaceId, overrides = {}) {
  const [r] = await getPool().query('INSERT INTO testimonials SET ?', [{
    space_id: spaceId, name: 'Nadia Rahman', email: 'nadia@example.com', job_title: 'Café owner', company: 'Brew & Co',
    social_link: 'https://example.com/nadia', rating: 5, body: 'The sourdough is the best in town.', consent_public: 1, ...overrides,
  }]);
  return r.insertId;
}

async function fillSpace(spaceId, n, { startDaysAgo = 400 } = {}) {
  const rows = Array.from({ length: n }, (_, i) => [spaceId, `Filler ${i}`, 'f@example.com', `filler ${i}`, startDaysAgo - i / 10]);
  await getPool().query(
    'INSERT INTO testimonials (space_id, name, email, body, created_at) VALUES ' +
      rows.map(() => '(?, ?, ?, ?, UTC_TIMESTAMP() - INTERVAL ? DAY)').join(', '),
    rows.flat(),
  );
}

const row = async (id) => (await getPool().execute('SELECT * FROM testimonials WHERE id = ?', [id]))[0][0];
const url = (spaceId, id = '') => `/api/spaces/${spaceId}/testimonials${id === '' ? '' : `/${id}`}`;

const editBody = (overrides = {}) => ({
  name: 'Nadia Rahman', jobTitle: 'Café owner', company: 'Brew & Co', socialLink: 'https://example.com/nadia',
  rating: 5, body: 'The sourdough is the best in town.', ...overrides,
});

async function savePhoto() {
  await mkdir(path.join(uploadsDir, 'photos'), { recursive: true });
  const name = `${'a'.repeat(31)}${Math.floor(Math.random() * 10)}.png`;
  await writeFile(path.join(uploadsDir, 'photos', name), 'png');
  return `photos/${name}`;
}

// ---------------------------------------------------------------- flags (E41–E43)

test('favourite, hide, and wall flags: favourite sorts first; the detail is returned', async () => {
  const { space, client } = await ownerWithSpace();
  const older = await addTestimonial(space.id, { name: 'Older', created_at: new Date(Date.now() - 86400000) });
  await addTestimonial(space.id, { name: 'Newer' });

  const res = await patch(client, url(space.id, older), { favorite: true });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.testimonial.isFavorite, true);
  const list = await client.get(url(space.id));
  assert.equal(list.body.testimonials[0].name, 'Older', 'favourite first');

  await patch(client, url(space.id, older), { favorite: false });
  assert.equal((await row(older)).is_favorite, 0);
});

test('wall needs public consent: no consent or social consent only → 409, nothing changes', async () => {
  const { space, client } = await ownerWithSpace();
  const none = await addTestimonial(space.id, { consent_public: 0 });
  const socialOnly = await addTestimonial(space.id, { consent_public: 0, consent_social: 1 });
  for (const id of [none, socialOnly]) {
    const res = await patch(client, url(space.id, id), { onWall: true });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /did not agree to public display/);
    assert.equal((await row(id)).on_wall, 0);
  }
  const ok = await addTestimonial(space.id);
  const res = await patch(client, url(space.id, ok), { onWall: true });
  assert.equal(res.status, 200);
  assert.equal(res.body.testimonial.onWall, true);
});

test('hiding takes it off the wall; unhiding does not put it back; hidden cannot go on the wall', async () => {
  const { space, client } = await ownerWithSpace();
  const id = await addTestimonial(space.id, { on_wall: 1 });
  const hidden = await patch(client, url(space.id, id), { hidden: true });
  assert.equal(hidden.status, 200);
  assert.deepEqual([hidden.body.testimonial.isHidden, hidden.body.testimonial.onWall], [true, false]);

  const blocked = await patch(client, url(space.id, id), { onWall: true });
  assert.equal(blocked.status, 409);
  assert.match(blocked.body.error, /Unhide it first/);
  assert.equal((await patch(client, url(space.id, id), { hidden: true, onWall: true })).status, 409);

  const unhidden = await patch(client, url(space.id, id), { hidden: false });
  assert.deepEqual([unhidden.body.testimonial.isHidden, unhidden.body.testimonial.onWall], [false, false]);
  // Unhide and add to the wall in one request is allowed.
  const both = await patch(client, url(space.id, id), { hidden: false, onWall: true });
  assert.equal(both.body.testimonial.onWall, true);
});

test('flags: only booleans and known keys; consent cannot be changed; non-JSON → 415', async () => {
  const { space, client } = await ownerWithSpace();
  const id = await addTestimonial(space.id, { consent_public: 0 });
  for (const body of [{}, { favorite: 'yes' }, { consentPublic: true }, { favorite: true, email: 'x@example.com' }, []]) {
    const res = await patch(client, url(space.id, id), body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.equal((await row(id)).consent_public, 0);
  assert.equal((await row(id)).is_favorite, 0, 'a rejected request changes nothing');
  const form = await client.request('PATCH', url(space.id, id), {
    raw: { body: 'favorite=true', headers: { 'content-type': 'application/x-www-form-urlencoded' } },
  });
  assert.equal(form.status, 415);
});

test('flags: combined bodies; hide + favourite in one request; two moderations of one row at once', async () => {
  const { space, client } = await ownerWithSpace();
  const id = await addTestimonial(space.id, { on_wall: 1 });
  const both = await patch(client, url(space.id, id), { hidden: true, favorite: true });
  assert.equal(both.status, 200);
  assert.deepEqual([both.body.testimonial.isHidden, both.body.testimonial.isFavorite, both.body.testimonial.onWall], [true, true, false]);

  // Two requests on the same row at the same time: the row lock serialises them; both apply.
  const other = await addTestimonial(space.id);
  const results = await Promise.all([
    patch(client, url(space.id, other), { favorite: true }),
    client.put(`${url(space.id, other)}/content`, editBody({ body: 'Edited at the same time.' })),
  ]);
  assert.deepEqual(results.map((r) => r.status), [200, 200]);
  const r = await row(other);
  assert.equal(r.is_favorite, 1);
  assert.equal(r.body, 'Edited at the same time.');
  assert.equal(r.original_body, 'The sourdough is the best in town.');
});

test('malformed ids → 404; unknown edit keys → 400', async () => {
  const { space, client } = await ownerWithSpace();
  const id = await addTestimonial(space.id);
  for (const path of [url(space.id, 'abc'), url('abc', id), url(space.id, '0'), url(space.id, '1.5')]) {
    assert.equal((await patch(client, path, { favorite: true })).status, 404, path);
  }
  const res = await client.put(`${url(space.id, id)}/content`, editBody({ photoUrl: '/uploads/photos/x.png' }));
  assert.equal(res.status, 400);
  assert.ok(res.body.fields.photoUrl);
});

// ---------------------------------------------------------------- owner isolation and locked (E39–E40)

test('owner isolation: another owner, another space, or no session cannot moderate', async () => {
  const a = await ownerWithSpace();
  const id = await addTestimonial(a.space.id);
  const b = await ownerWithSpace();

  assert.equal((await patch(b.client, url(a.space.id, id), { favorite: true })).status, 404);
  assert.equal((await b.client.put(`${url(a.space.id, id)}/content`, editBody({ body: 'Hacked' }))).status, 404);
  assert.equal((await b.client.delete(url(a.space.id, id))).status, 404);
  // B's own space id with A's testimonial id.
  assert.equal((await patch(b.client, url(b.space.id, id), { favorite: true })).status, 404);
  assert.equal((await b.client.delete(url(b.space.id, id))).status, 404);
  // Logged out.
  assert.equal((await patch(customer(), url(a.space.id, id), { favorite: true })).status, 401);
  assert.equal((await customer().delete(url(a.space.id, id))).status, 401);

  const after = await row(id);
  assert.equal(after.is_favorite, 0);
  assert.equal(after.body, 'The sourdough is the best in town.');
});

test('locked testimonials: every action is 403 { locked: true } and nothing changes', async () => {
  const { space, client } = await ownerWithSpace();
  await fillSpace(space.id, 100);
  const locked = await addTestimonial(space.id, { name: 'Number 101' });
  const before = await row(locked);

  for (const res of [
    await patch(client, url(space.id, locked), { favorite: true }),
    await patch(client, url(space.id, locked), { hidden: true }),
    await patch(client, url(space.id, locked), { onWall: true }),
    await client.put(`${url(space.id, locked)}/content`, editBody({ body: 'Edited' })),
    await client.delete(url(space.id, locked)),
  ]) {
    assert.equal(res.status, 403);
    assert.equal(res.body.locked, true);
    assert.equal(res.body.name, undefined, 'no content');
  }
  assert.deepEqual(await row(locked), before);
});

// ---------------------------------------------------------------- edit (E44–E45)

test('edit: changes are saved, edited_at set, original text kept from the first edit only', async () => {
  const { space, client } = await ownerWithSpace();
  const id = await addTestimonial(space.id);

  const first = await client.put(`${url(space.id, id)}/content`, editBody({ body: 'Best sourdough in town.', rating: 4, company: '' }));
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const t = first.body.testimonial;
  assert.equal(t.body, 'Best sourdough in town.');
  assert.equal(t.originalBody, 'The sourdough is the best in town.');
  assert.equal(t.rating, 4);
  assert.equal(t.company, '');
  assert.ok(t.editedAt);

  await client.put(`${url(space.id, id)}/content`, editBody({ body: 'Third version.' }));
  assert.equal((await row(id)).original_body, 'The sourdough is the best in town.', 'original kept from the first edit');

  // Detail fields change but not the body: original_body stays null on a fresh testimonial.
  const other = await addTestimonial(space.id);
  await client.put(`${url(space.id, other)}/content`, editBody({ name: 'N. Rahman' }));
  const o = await row(other);
  assert.equal(o.name, 'N. Rahman');
  assert.equal(o.original_body, null);
  assert.ok(o.edited_at);

  const list = await client.get(url(space.id));
  assert.ok(list.body.testimonials.every((x) => x.edited));
});

test('edit with no changes leaves edited_at unset; rating can be cleared', async () => {
  const { space, client } = await ownerWithSpace();
  const id = await addTestimonial(space.id);
  const same = await client.put(`${url(space.id, id)}/content`, editBody());
  assert.equal(same.status, 200);
  assert.equal(same.body.testimonial.editedAt, null);

  const cleared = await client.put(`${url(space.id, id)}/content`, editBody({ rating: null }));
  assert.equal(cleared.body.testimonial.rating, null);
});

test('edit validation: limits, link scheme, and email/consent cannot be edited', async () => {
  const { space, client } = await ownerWithSpace();
  const id = await addTestimonial(space.id, { consent_public: 0 });
  const bad = await client.put(`${url(space.id, id)}/content`, editBody({
    name: '', body: 'x'.repeat(2001), jobTitle: 'j'.repeat(101), socialLink: 'javascript:alert(1)', rating: 6,
  }));
  assert.equal(bad.status, 400);
  assert.deepEqual(Object.keys(bad.body.fields).sort(), ['body', 'jobTitle', 'name', 'rating', 'socialLink']);

  const email = await client.put(`${url(space.id, id)}/content`, editBody({ email: 'new@example.com' }));
  assert.equal(email.status, 400);
  assert.match(email.body.fields.email, /cannot be changed/);
  const consent = await client.put(`${url(space.id, id)}/content`, editBody({ consentPublic: true }));
  assert.equal(consent.status, 400);

  const r = await row(id);
  assert.equal(r.email, 'nadia@example.com');
  assert.equal(r.consent_public, 0);
  assert.equal(r.edited_at, null);
});

test('edit: removing the photo deletes its file after saving', async () => {
  const { space, client } = await ownerWithSpace();
  const photo = await savePhoto();
  const id = await addTestimonial(space.id, { photo_path: photo });
  const res = await client.put(`${url(space.id, id)}/content`, editBody({ removePhoto: true }));
  assert.equal(res.status, 200);
  assert.equal(res.body.testimonial.photoUrl, null);
  assert.ok(res.body.testimonial.editedAt);
  assert.equal(existsSync(path.join(uploadsDir, ...photo.split('/'))), false);
});

// ---------------------------------------------------------------- delete (E46)

test('delete: answers cascade, photo file removed, 204', async () => {
  const { space, client } = await ownerWithSpace();
  const photo = await savePhoto();
  const id = await addTestimonial(space.id, { photo_path: photo });
  await getPool().query('INSERT INTO testimonial_answers SET ?', [{
    testimonial_id: id, question_id: space.questions[0].id, question_snapshot: space.questions[0].text, answer_text: 'Bread', position: 1,
  }]);
  const res = await client.delete(url(space.id, id));
  assert.equal(res.status, 204);
  assert.equal(await row(id), undefined);
  const [[{ n }]] = await getPool().execute('SELECT COUNT(*) AS n FROM testimonial_answers WHERE testimonial_id = ?', [id]);
  assert.equal(Number(n), 0);
  assert.equal(existsSync(path.join(uploadsDir, ...photo.split('/'))), false);
  assert.equal((await client.delete(url(space.id, id))).status, 404, 'already gone');
});

test('delete frees capacity: the oldest locked testimonial becomes visible', async () => {
  const { space, client } = await ownerWithSpace();
  await fillSpace(space.id, 100);
  const locked = await addTestimonial(space.id, { name: 'Number 101' });
  assert.equal((await client.get(url(space.id, locked))).status, 403);

  const first = (await client.get(url(space.id))).body.testimonials.at(-1); // oldest visible
  assert.equal((await client.delete(url(space.id, first.id))).status, 204);

  const inbox = await client.get(url(space.id));
  assert.deepEqual(inbox.body.counts, { visible: 100, locked: 0, total: 100 });
  assert.equal((await client.get(url(space.id, locked))).status, 200);
});

// ---------------------------------------------------------------- public wall (E48)

const WALL_KEYS = ['body', 'company', 'createdAt', 'edited', 'jobTitle', 'name', 'photoUrl', 'rating'];

test('public wall: only on-wall, visible, consented testimonials; exactly the allowed keys', async () => {
  const { space, client } = await ownerWithSpace();
  const shown = await addTestimonial(space.id, { on_wall: 1, name: 'Shown', original_body: 'Old words', edited_at: new Date() });
  await addTestimonial(space.id, { on_wall: 0, name: 'Not selected' });
  await addTestimonial(space.id, { is_hidden: 1, name: 'Hidden' });
  await addTestimonial(space.id, { consent_public: 0, consent_social: 1, name: 'No public consent' });

  const res = await customer().get(`/api/public/spaces/${space.slug}/wall`);
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.body).sort(), ['space', 'testimonials']);
  assert.deepEqual(Object.keys(res.body.space).sort(), ['brandColor', 'logoUrl', 'slug', 'subtitle', 'themeCode', 'title']);
  assert.equal(res.body.testimonials.length, 1);
  const t = res.body.testimonials[0];
  assert.deepEqual(Object.keys(t).sort(), WALL_KEYS);
  assert.equal(t.name, 'Shown');
  assert.equal(t.edited, true);
  const text = JSON.stringify(res.body);
  for (const secret of ['nadia@example.com', 'https://example.com/nadia', 'Old words', 'consent', 'email', `"id"`, String(shown)]) {
    assert.ok(!text.includes(secret), `no ${secret} in the public wall`);
  }

  // Removing it from the wall takes effect at once (no-store, E51).
  await patch(client, url(space.id, shown), { onWall: false });
  const after = await customer().get(`/api/public/spaces/${space.slug}/wall`);
  assert.deepEqual(after.body.testimonials, []);
  assert.equal(after.headers.get('cache-control'), 'no-store');
});

test('public wall: locked on-wall testimonials are excluded (rank by submission order)', async () => {
  const { space, user } = await ownerWithSpace();
  // Ranks: "Oldest" 1, fillers 2–99, "Rank 100" 100, "Rank 101" 101 (locked on Free).
  await addTestimonial(space.id, { on_wall: 1, name: 'Oldest', created_at: new Date(Date.now() - 500 * 86400000) });
  await fillSpace(space.id, 98);
  await addTestimonial(space.id, { on_wall: 1, name: 'Rank 100', created_at: new Date(Date.now() - 60000) });
  await addTestimonial(space.id, { on_wall: 1, name: 'Rank 101' });

  const res = await customer().get(`/api/public/spaces/${space.slug}/wall`);
  assert.deepEqual(res.body.testimonials.map((t) => t.name), ['Rank 100', 'Oldest']);

  // Upgrading raises the limit, so the locked one appears.
  await getPool().execute("UPDATE users SET plan_code = 'paid' WHERE id = ?", [user.id]);
  const paid = await customer().get(`/api/public/spaces/${space.slug}/wall`);
  assert.deepEqual(paid.body.testimonials.map((t) => t.name), ['Rank 101', 'Rank 100', 'Oldest']);
});

test('public wall: newest first; empty wall; unknown or malformed slug → 404', async () => {
  const { space } = await ownerWithSpace();
  const empty = await customer().get(`/api/public/spaces/${space.slug}/wall`);
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.testimonials, []);

  await addTestimonial(space.id, { on_wall: 1, name: 'First', created_at: new Date(Date.now() - 86400000) });
  await addTestimonial(space.id, { on_wall: 1, name: 'Second' });
  const res = await customer().get(`/api/public/spaces/${space.slug}/wall`);
  assert.deepEqual(res.body.testimonials.map((t) => t.name), ['Second', 'First']);

  assert.equal((await customer().get('/api/public/spaces/no-such-space/wall')).status, 404);
  assert.equal((await customer().get(`/api/public/spaces/${space.slug.toUpperCase()}/wall`)).status, 404);
  assert.equal((await customer().get(`/api/public/spaces/${space.slug}%20/wall`)).status, 404);
});
