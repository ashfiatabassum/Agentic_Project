// Public collection API (E21–E25, hardened after the M3 reviews: E34–E35).
// No login and no cookie: customers never have accounts.
//   GET  /api/public/spaces/:slug               display data for the collection page
//   POST /api/public/spaces/:slug/testimonials  multipart: "data" (JSON) + optional "photo"
import { Router } from 'express';
import multer from 'multer';
import { HttpError, notFound, validationError } from '../lib/http.js';
import { MAX_IMAGE_BYTES } from '../lib/uploads.js';
import { slugProblem } from '../services/spaces.js';
import { getPublicSpace, submitTestimonial } from '../services/testimonials.js';

const upload = multer({
  storage: multer.memoryStorage(),
  // One JSON "data" field (answers included, well under 32 KB) and at most one photo.
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 1, parts: 2, fieldSize: 32 * 1024 },
}).single('photo');

/** E34: anything that is not a well-formed slug is "not found" before rate limits or queries. */
function requireValidSlug(req, res, next) {
  if (slugProblem(req.params.slug)) return next(notFound());
  return next();
}

function tooMany(res, limiter, key) {
  res.set('Retry-After', String(limiter.retryAfter(key)));
  return new HttpError(429, 'Too many testimonials from this device. Please try again in a few minutes.');
}

/** limits.submit (per IP + space, E25) and limits.submitAttempts (per IP, E35), see app.js. */
export function createPublicRouter(limits) {
  const router = Router();

  router.get('/spaces/:slug', requireValidSlug, async (req, res) => {
    res.json({ space: await getPublicSpace(req.params.slug) });
  });

  router.post('/spaces/:slug/testimonials', requireValidSlug, (req, res, next) => {
    // Both limits are counted before any await so parallel requests cannot slip past.
    // E35: every attempt from an IP counts toward a looser limit that is never given back,
    // so invalid requests (and their uploads) cannot be repeated without limit.
    const ipKey = req.ip;
    if (limits.submitAttempts.isLimited(ipKey)) return next(tooMany(res, limits.submitAttempts, ipKey));
    // E25: 5 submissions per IP per space per 10 minutes; given back when a request is rejected
    // as invalid or unknown, so a customer fixing typos is not locked out.
    const key = `${req.ip}|${req.params.slug}`;
    if (limits.submit.isLimited(key)) return next(tooMany(res, limits.submit, key));
    limits.submitAttempts.hit(ipKey);
    limits.submit.hit(key);
    req.rateKey = key;

    upload(req, res, (error) => {
      if (!error) return next();
      limits.submit.undo(key); // rejected before validation: give back the per-space allowance
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return next(validationError({ photo: 'The photo must be 2 MB or smaller' }));
      }
      // Other parser errors (extra parts, cut-off bodies, malformed multipart) are client errors.
      return next(validationError({ form: 'The form could not be read. Reload the page and try again.' }));
    });
  }, async (req, res) => {
    try {
      let data;
      try {
        data = JSON.parse(req.body?.data ?? '');
      } catch {
        throw validationError({ form: 'The form could not be read. Reload the page and try again.' });
      }
      // The service checks the space and the data first; the photo is only type-checked and
      // saved if the space collects photos and everything else is valid (E34).
      const photo = req.file ? req.file.buffer : null;
      res.status(201).json(await submitTestimonial(req.params.slug, { data, photo }));
    } catch (error) {
      if (error.status === 400 || error.status === 404) limits.submit.undo(req.rateKey);
      throw error;
    }
  });

  return router;
}
