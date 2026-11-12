// requireAuth (PRD §10 Q12): every private API uses it. Missing, unknown, or expired session
// -> 401 { error: 'Not signed in' }. On success req.user = { id, name, email, plan_code }.
import { notSignedIn } from '../lib/http.js';
import { findSessionUser, readSessionToken } from '../lib/sessions.js';

export async function requireAuth(req, res, next) {
  const user = await findSessionUser(readSessionToken(req));
  if (!user) throw notSignedIn();
  req.user = user;
  next();
}
