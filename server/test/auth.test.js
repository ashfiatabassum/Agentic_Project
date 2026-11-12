// FR-01 login tests (PRD §10 Q14) against testimonial_mvp_test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { closePool, getPool } from '../src/db.js';
import { Client, startServer } from './helpers/api.js';
import { unique } from './helpers/db.js';

let app;
before(async () => { app = await startServer({ rateLimits: { register: { max: 1000 }, login: { max: 1000 } } }); });
after(async () => { await app.close(); await closePool(); });

const newEmail = () => `${unique('user')}@Example.com`;

test('register creates a Free owner, sets an HttpOnly session cookie, and signs in', async () => {
  const c = new Client(app.baseUrl);
  const email = newEmail();
  const res = await c.post('/api/auth/register', { name: '  Ashfia  ', email: `  ${email} `, password: 'long-enough' });
  assert.equal(res.status, 201);
  assert.deepEqual(Object.keys(res.body.user).sort(), ['email', 'id', 'name', 'plan']);
  assert.equal(res.body.user.name, 'Ashfia');
  assert.equal(res.body.user.email, email.toLowerCase());
  assert.equal(res.body.user.plan, 'free');

  const cookie = res.setCookies.find((line) => line.startsWith('sid='));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=604800/);
  assert.doesNotMatch(cookie, /Secure/); // only in production

  const me = await c.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.id, res.body.user.id);

  // Only the token's SHA-256 hash is stored.
  const token = c.cookies.get('sid');
  const [rows] = await getPool().execute('SELECT token_hash FROM sessions WHERE user_id = ?', [res.body.user.id]);
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].token_hash, token);
  assert.match(rows[0].token_hash, /^[0-9a-f]{64}$/);
});

test('the client cannot choose a plan when registering', async () => {
  const c = new Client(app.baseUrl);
  const res = await c.post('/api/auth/register', { name: 'X', email: newEmail(), password: 'long-enough', plan: 'paid', plan_code: 'paid' });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.plan, 'free');
});

test('duplicate email (different case) returns 409', async () => {
  const email = newEmail();
  const first = await new Client(app.baseUrl).post('/api/auth/register', { name: 'A', email, password: 'long-enough' });
  assert.equal(first.status, 201);
  const second = await new Client(app.baseUrl).post('/api/auth/register', { name: 'B', email: email.toUpperCase(), password: 'long-enough' });
  assert.equal(second.status, 409);
  assert.equal(second.body.error, 'An account with this email already exists.');
});

test('registration validates name, email, and password', async () => {
  const c = new Client(app.baseUrl);
  const res = await c.post('/api/auth/register', { name: '   ', email: 'not-an-email', password: 'short' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Validation failed');
  assert.deepEqual(Object.keys(res.body.fields).sort(), ['email', 'name', 'password']);

  const long = await c.post('/api/auth/register', { name: 'x'.repeat(101), email: newEmail(), password: 'p'.repeat(129) });
  assert.equal(long.status, 400);
  assert.deepEqual(Object.keys(long.body.fields).sort(), ['name', 'password']);

  // Names in any script count characters, not bytes: 100 Bangla characters are fine.
  const bangla = await c.post('/api/auth/register', { name: 'আ'.repeat(100), email: newEmail(), password: 'long-enough' });
  assert.equal(bangla.status, 201);
  assert.equal(c.cookies.has('sid'), true);
});

test('login succeeds with correct credentials and fails identically otherwise', async () => {
  const email = newEmail();
  await new Client(app.baseUrl).post('/api/auth/register', { name: 'L', email, password: 'right-password' });

  const ok = await new Client(app.baseUrl).post('/api/auth/login', { email: email.toUpperCase(), password: 'right-password' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.email, email.toLowerCase());
  assert.ok(ok.setCookies.some((line) => line.startsWith('sid=')));

  const wrongPassword = await new Client(app.baseUrl).post('/api/auth/login', { email, password: 'wrong-password' });
  const unknownEmail = await new Client(app.baseUrl).post('/api/auth/login', { email: newEmail(), password: 'right-password' });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(wrongPassword.body, { error: 'Invalid email or password' });
  assert.deepEqual(unknownEmail.body, wrongPassword.body);
  assert.equal(wrongPassword.setCookies.length, 0);
});

test('/me without a cookie, or with a forged one, returns 401', async () => {
  const anon = await new Client(app.baseUrl).get('/api/auth/me');
  assert.equal(anon.status, 401);
  assert.deepEqual(anon.body, { error: 'Not signed in' });

  const forged = new Client(app.baseUrl);
  forged.cookies.set('sid', 'A'.repeat(43));
  assert.equal((await forged.get('/api/auth/me')).status, 401);
});

test('after logout the old cookie is rejected; other devices stay signed in', async () => {
  const email = newEmail();
  const laptop = new Client(app.baseUrl);
  await laptop.post('/api/auth/register', { name: 'D', email, password: 'long-enough' });
  const phone = new Client(app.baseUrl);
  await phone.post('/api/auth/login', { email, password: 'long-enough' });

  const oldToken = laptop.cookies.get('sid');
  const out = await laptop.post('/api/auth/logout');
  assert.equal(out.status, 204);
  assert.ok(out.setCookies.some((line) => /^sid=;/.test(line) && /Max-Age=0/.test(line)));

  const replay = new Client(app.baseUrl);
  replay.cookies.set('sid', oldToken);
  assert.equal((await replay.get('/api/auth/me')).status, 401);
  assert.equal((await phone.get('/api/auth/me')).status, 200);

  // Logout without a session still succeeds.
  assert.equal((await new Client(app.baseUrl).post('/api/auth/logout')).status, 204);
});

test('an expired session is rejected and cleaned up at the next login', async () => {
  const email = newEmail();
  const c = new Client(app.baseUrl);
  const reg = await c.post('/api/auth/register', { name: 'E', email, password: 'long-enough' });
  await getPool().execute('UPDATE sessions SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE user_id = ?', [reg.body.user.id]);
  assert.equal((await c.get('/api/auth/me')).status, 401);

  await new Client(app.baseUrl).post('/api/auth/login', { email, password: 'long-enough' });
  const [[{ expired }]] = await getPool().execute(
    'SELECT COUNT(*) AS expired FROM sessions WHERE expires_at <= UTC_TIMESTAMP()');
  assert.equal(Number(expired), 0);
});

test('state-changing requests that are not JSON get 415', async () => {
  const c = new Client(app.baseUrl);
  const form = await c.request('POST', '/api/auth/login', {
    raw: { headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=a%40b.c&password=x' },
  });
  assert.equal(form.status, 415);
  const text = await c.request('POST', '/api/auth/register', { raw: { headers: { 'content-type': 'text/plain' }, body: '{}' } });
  assert.equal(text.status, 415);
  const none = await c.request('POST', '/api/spaces', { raw: {} });
  assert.equal(none.status, 415);
});

test('logout always succeeds, whatever the content type (PRD §10 Q13)', async () => {
  const c = new Client(app.baseUrl);
  await c.post('/api/auth/register', { name: 'O', email: newEmail(), password: 'long-enough' });
  const res = await c.request('POST', '/api/auth/logout', { raw: { headers: { 'content-type': 'text/plain' }, body: 'x' } });
  assert.equal(res.status, 204);
  assert.equal((await c.get('/api/auth/me')).status, 401);
  assert.equal((await new Client(app.baseUrl).request('POST', '/api/auth/logout', { raw: {} })).status, 204);
});

test('the 11th failed login from one IP within 15 minutes gets 429', async () => {
  const limited = await startServer(); // default limits
  try {
    const email = newEmail();
    await new Client(limited.baseUrl).post('/api/auth/register', { name: 'R', email, password: 'long-enough' });
    for (let i = 0; i < 10; i += 1) {
      const res = await new Client(limited.baseUrl).post('/api/auth/login', { email, password: `wrong-${i}` });
      assert.equal(res.status, 401, `attempt ${i + 1}`);
    }
    const eleventh = await new Client(limited.baseUrl).post('/api/auth/login', { email, password: 'long-enough' });
    assert.equal(eleventh.status, 429);
    assert.ok(Number(eleventh.headers.get('retry-after')) > 0);
  } finally {
    await limited.close();
  }
});

test('parallel failed logins cannot get past the limit; a successful login is not counted', async () => {
  const limited = await startServer();
  try {
    const email = newEmail();
    await new Client(limited.baseUrl).post('/api/auth/register', { name: 'P', email, password: 'long-enough' });
    // Successful logins do not use up the allowance.
    for (let i = 0; i < 3; i += 1) {
      assert.equal((await new Client(limited.baseUrl).post('/api/auth/login', { email, password: 'long-enough' })).status, 200);
    }
    const results = await Promise.all(Array.from({ length: 15 }, (_, i) =>
      new Client(limited.baseUrl).post('/api/auth/login', { email, password: `wrong-${i}` })));
    const statuses = results.map((r) => r.status);
    assert.equal(statuses.filter((s) => s === 401).length, 10, statuses.join(','));
    assert.equal(statuses.filter((s) => s === 429).length, 5, statuses.join(','));
  } finally {
    await limited.close();
  }
});

test('the 6th registration from one IP within an hour gets 429', async () => {
  const limited = await startServer();
  try {
    for (let i = 0; i < 5; i += 1) {
      const res = await new Client(limited.baseUrl).post('/api/auth/register', { name: 'R', email: newEmail(), password: 'long-enough' });
      assert.equal(res.status, 201, `registration ${i + 1}`);
    }
    const sixth = await new Client(limited.baseUrl).post('/api/auth/register', { name: 'R', email: newEmail(), password: 'long-enough' });
    assert.equal(sixth.status, 429);
  } finally {
    await limited.close();
  }
});
