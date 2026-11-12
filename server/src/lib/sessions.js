// Server-side sessions (PRD §10 Q7): the cookie holds a random 32-byte token; the database
// stores only its SHA-256 hash. Fixed 7-day lifetime, no sliding renewal.
import { createHash, randomBytes } from 'node:crypto';
import { getPool } from '../db.js';
import { config } from '../config.js';
import { parseCookies, serializeCookie } from './cookies.js';

export const SESSION_COOKIE = 'sid';
export const SESSION_DAYS = 7;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // 32 bytes, base64url

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function readSessionToken(req) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  return typeof token === 'string' && TOKEN_RE.test(token) ? token : null;
}

/** Creates a session row and returns the raw token for the cookie. Also deletes expired rows (Q7a). */
export async function createSession(userId) {
  const pool = getPool();
  const token = randomBytes(32).toString('base64url');
  // Independent statements run in parallel (vercel async-parallel). Clean-up is best-effort:
  // its range lock may rarely conflict with a concurrent login, which must never fail the login.
  await Promise.all([
    pool.execute('DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP()')
      .catch((error) => console.warn('Expired-session clean-up skipped:', error.code ?? error.message)),
    pool.execute(
      'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, UTC_TIMESTAMP() + INTERVAL ? DAY)',
      [hashToken(token), userId, SESSION_DAYS],
    ),
  ]);
  return token;
}

/** Returns the signed-in user for a token, or null when the session is unknown or expired. */
export async function findSessionUser(token) {
  if (!token) return null;
  const [rows] = await getPool().execute(
    `SELECT u.id, u.name, u.email, u.plan_code
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function deleteSession(token) {
  if (!token) return;
  await getPool().execute('DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]);
}

export function setSessionCookie(res, token) {
  res.append('Set-Cookie', serializeCookie(SESSION_COOKIE, token, { maxAge: SESSION_SECONDS, secure: config.isProduction }));
}

export function clearSessionCookie(res) {
  res.append('Set-Cookie', serializeCookie(SESSION_COOKIE, '', { maxAge: 0, secure: config.isProduction }));
}

/** Public user shape (PRD §10 Q13): never includes the password hash. */
export const toPublicUser = (row) => ({ id: row.id, name: row.name, email: row.email, plan: row.plan_code });
