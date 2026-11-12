// Owner inbox API (E28–E30), mounted at /api/spaces/:spaceId/testimonials.
// Every route requires a session; another owner's space returns 404.
import { Router } from 'express';
import { parseId } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { getTestimonial, listTestimonials, parseInboxQuery } from '../services/testimonials.js';

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

export default router;
