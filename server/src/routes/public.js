// Public collection API (E21–E25). No login and no cookie: customers never have accounts.
//   GET  /api/public/spaces/:slug               display data for the collection page
//   POST /api/public/spaces/:slug/testimonials  multipart: "data" (JSON) + optional "photo"
import { Router } from 'express';
import multer from 'multer';
import { HttpError, validationError } from '../lib/http.js';
import { detectImageType, MAX_IMAGE_BYTES, saveImage } from '../lib/uploads.js';
import { getPublicSpace, submitTestimonial } from '../services/testimonials.js';

const upload = multer({
  storage: multer.memoryStorage(),
  // One JSON "data" field (answers included, well under 32 KB) and at most one photo.
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 1, parts: 2, fieldSize: 32 * 1024 },
}).single('photo');

function readSubmission(req, res, next) {
  upload(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'The photo must be 2 MB or smaller'
        : 'Send the form as a "data" field and at most one "photo" file';
      return next(validationError({ [error.code === 'LIMIT_FILE_SIZE' ? 'photo' : 'form']: message }));
    }
    return next(error);
  });
}

/** limits.submit: rate limiter created per app instance (see app.js). */
export function createPublicRouter(limits) {
  const router = Router();

  router.get('/spaces/:slug', async (req, res) => {
    res.json({ space: await getPublicSpace(req.params.slug) });
  });

  router.post('/spaces/:slug/testimonials', async (req, res, next) => {
    // E25: 5 submissions per IP per space per 10 minutes. Counted before any await so parallel
    // requests cannot slip past; given back when the request is rejected as invalid.
    const key = `${req.ip}|${req.params.slug}`;
    if (limits.submit.isLimited(key)) {
      res.set('Retry-After', String(limits.submit.retryAfter(key)));
      throw new HttpError(429, 'Too many testimonials from this device. Please try again in a few minutes.');
    }
    limits.submit.hit(key);
    req.rateKey = key;
    next();
  }, readSubmission, async (req, res) => {
    try {
      let data;
      try {
        data = JSON.parse(req.body?.data ?? '');
      } catch {
        throw validationError({ form: 'The form data could not be read. Reload the page and try again.' });
      }

      let photoPath = null;
      if (req.file) {
        const ext = detectImageType(req.file.buffer);
        if (!ext) throw validationError({ photo: 'The photo must be a JPEG, PNG, or WebP image' });
        // File I/O happens before the transaction; the service deletes the file if saving fails (D10).
        photoPath = await saveImage(req.file.buffer, 'photos', ext);
      }

      res.status(201).json(await submitTestimonial(req.params.slug, { data, photoPath }));
    } catch (error) {
      // Rejected submissions (invalid, unknown page, full) do not use up the allowance.
      if (error.status === 400 || error.status === 404) limits.submit.undo(req.rateKey);
      throw error;
    }
  });

  return router;
}
