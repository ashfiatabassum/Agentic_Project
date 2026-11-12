// Owner inbox API (E28–E30), mounted at /api/spaces/:spaceId/testimonials.
// Every route requires a session; another owner's space returns 404.
import { Router } from 'express';
import { parseId } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import {
  deleteTestimonial, getTestimonial, listTestimonials, parseContent, parseFlags, parseInboxQuery, updateContent, updateFlags,
} from '../services/testimonials.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

// GET /api/spaces/:spaceId/testimonials?filter=all|favorites|on_wall|hidden|public&q=text
router.get('/', async (req, res) => {
  res.json(await listTestimonials(req.user.id, parseId(req.params.spaceId), parseInboxQuery(req.query)));
});

router.get('/:testimonialId', async (req, res) => {
  const testimonial = await getTestimonial(req.user.id, parseId(req.params.spaceId), parseId(req.params.testimonialId));
  res.json({ testimonial });
});

// M4 moderation (E39–E46). Owner only; locked → 403 { locked: true }; ineligible wall → 409.
const ids = (req) => [req.user.id, parseId(req.params.spaceId), parseId(req.params.testimonialId)];

// PATCH { favorite?, hidden?, onWall? }
router.patch('/:testimonialId', async (req, res) => {
  const [ownerId, spaceId, testimonialId] = ids(req);
  const flags = parseFlags(req.body);
  res.json({ testimonial: await updateFlags(ownerId, spaceId, testimonialId, flags) });
});

// PUT { name, jobTitle, company, socialLink, rating, body, removePhoto? }
router.put('/:testimonialId/content', async (req, res) => {
  const [ownerId, spaceId, testimonialId] = ids(req);
  const content = parseContent(req.body);
  res.json({ testimonial: await updateContent(ownerId, spaceId, testimonialId, content) });
});

router.delete('/:testimonialId', async (req, res) => {
  await deleteTestimonial(...ids(req));
  res.status(204).end();
});

export default router;
