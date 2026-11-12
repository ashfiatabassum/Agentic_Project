// GET /api/dashboard?days=7|30&tzOffset=<minutes> — the signed-in owner's statistics (M6, E80).
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDashboard, parseDashboardQuery } from '../services/dashboard.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  res.json(await getDashboard(req.user.id, parseDashboardQuery(req.query)));
});

export default router;
