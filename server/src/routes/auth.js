// Owner authentication (FR-01, PRD §10): register, login, logout, me.
import { Router } from 'express';
import { getPool } from '../db.js';
import { HttpError } from '../lib/http.js';
import { hashPassword, verifyPassword, PASSWORD_MAX, PASSWORD_MIN } from '../lib/password.js';
import {
  clearSessionCookie, createSession, deleteSession, readSessionToken, setSessionCookie, toPublicUser,
} from '../lib/sessions.js';
import { charLength, isPlainObject, Validator } from '../lib/validate.js';
import { requireAuth } from '../middleware/auth.js';

const INVALID_LOGIN = 'Invalid email or password';

// Hash checked when the email is unknown, so a failed login takes the same time either way (Q9).
let dummyHashPromise;
const dummyHash = () => (dummyHashPromise ??= hashPassword('dummy-password-for-timing'));

function tooManyRequests(res, limiter, key) {
  res.set('Retry-After', String(limiter.retryAfter(key)));
  return new HttpError(429, 'Too many attempts. Please try again later.');
}

function passwordField(v, value) {
  if (typeof value !== 'string' || value.length === 0) {
    v.error('password', 'Password is required');
    return '';
  }
  const length = charLength(value);
  if (length < PASSWORD_MIN) v.error('password', `Password must be at least ${PASSWORD_MIN} characters`);
  else if (length > PASSWORD_MAX) v.error('password', `Password must be at most ${PASSWORD_MAX} characters`);
  return value;
}

/** limits = { login, register } rate limiters created per app instance (see app.js). */
export function createAuthRouter(limits) {
  const router = Router();
  dummyHash().catch(() => { dummyHashPromise = undefined; }); // prepare now, not on the first unknown-email login

  router.post('/register', async (req, res) => {
    const ip = req.ip;
    if (limits.register.isLimited(ip)) throw tooManyRequests(res, limits.register, ip);

    const body = isPlainObject(req.body) ? req.body : {};
    const v = new Validator();
    const name = v.text(body.name, 'name', { label: 'Name', max: 100, required: true });
    const email = v.email(body.email);
    const password = passwordField(v, body.password);
    v.assert();

    // Only well-formed attempts count toward the 5-per-hour limit, so typos do not lock a person out.
    limits.register.hit(ip);
    const passwordHash = await hashPassword(password);
    let userId;
    try {
      const [result] = await getPool().execute(
        'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, passwordHash]);
      userId = result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'An account with this email already exists.', { email: 'An account with this email already exists.' });
      }
      throw error;
    }

    setSessionCookie(res, await createSession(userId));
    res.status(201).json({ user: toPublicUser({ id: userId, name, email, plan_code: 'free' }) });
  });

  router.post('/login', async (req, res) => {
    const ip = req.ip;
    if (limits.login.isLimited(ip)) throw tooManyRequests(res, limits.login, ip);

    const body = isPlainObject(req.body) ? req.body : {};
    const v = new Validator();
    const email = v.text(body.email, 'email', { label: 'Email', max: 254, required: true }).toLowerCase();
    if (typeof body.password !== 'string' || body.password.length === 0) v.error('password', 'Password is required');
    else if (charLength(body.password) > PASSWORD_MAX) v.error('password', INVALID_LOGIN);
    v.assert();

    // Count the attempt before any await, so parallel requests cannot all slip past the
    // check while scrypt runs; a successful login gives it back (only failures count, Q9).
    limits.login.hit(ip);

    const [rows] = await getPool().execute(
      'SELECT id, name, email, password_hash, plan_code FROM users WHERE email = ?', [email]);
    const user = rows[0];
    const ok = user
      ? await verifyPassword(body.password, user.password_hash)
      : (await verifyPassword(body.password, await dummyHash()), false);

    if (!ok) throw new HttpError(401, INVALID_LOGIN);
    limits.login.undo(ip);

    setSessionCookie(res, await createSession(user.id));
    res.json({ user: toPublicUser(user) });
  });

  // Always succeeds: ends only this device's session (Q7a) and clears the cookie.
  router.post('/logout', async (req, res) => {
    await deleteSession(readSessionToken(req));
    clearSessionCookie(res);
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: toPublicUser(req.user) });
  });

  return router;
}
