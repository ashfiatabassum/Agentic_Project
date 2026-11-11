import { Router } from 'express';
import { checkDatabase } from '../db.js';

const router = Router();

// GET /api/health -> 200 when the API and database are reachable, 503 otherwise.
router.get('/', async (req, res) => {
  const database = await checkDatabase();
  res.status(database.ok ? 200 : 503).json({
    status: database.ok ? 'ok' : 'degraded',
    api: 'ok',
    database: database.ok ? 'ok' : database.reason,
  });
});

export default router;
