// CSRF defence part 2 (PRD §10 Q11; part 1 is SameSite=Lax cookies): every state-changing
// API request must be sent as application/json, which a cross-site HTML form cannot do.
// Other content types get 415. The logo upload is the only multipart route; it is listed
// here and additionally requires a custom header (see routes/spaces.js), which a cross-site
// page cannot send without a CORS preflight that this API never allows.
import { HttpError } from '../lib/http.js';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * anyTypeRoutes: body-less routes that must always succeed whatever the content type
 * (logout, PRD §10 Q13). A forged cross-site logout carries no cookie under SameSite=Lax.
 */
export function jsonOnly({ multipartRoutes = [], anyTypeRoutes = [] } = {}) {
  return (req, res, next) => {
    if (!STATE_CHANGING.has(req.method)) return next();
    if (anyTypeRoutes.some((re) => re.test(req.path))) return next();
    const type = (req.headers['content-type'] ?? '').toLowerCase();
    if (/^application\/json\s*(;|$)/.test(type)) return next();
    if (type.startsWith('multipart/form-data') && multipartRoutes.some((re) => re.test(req.path))) return next();
    throw new HttpError(415, 'Requests must be sent as JSON (Content-Type: application/json)');
  };
}
