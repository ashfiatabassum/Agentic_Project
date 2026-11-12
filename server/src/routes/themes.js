// GET /api/themes — the predefined collection-page themes (lookup data, not private).
import { Router } from 'express';
import { listThemes } from '../services/spaces.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json({ themes: await listThemes() });
});

export default router;
