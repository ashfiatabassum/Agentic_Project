// Billing demo routes (M7, E101–E103). Every write here is a SIMULATION: nothing is charged.
//   GET  /api/plans                          — public plan list (createPlansRouter)
//   GET  /api/billing                        — owner: plan, upgrade option, simulated events
//   POST /api/billing/simulate-upgrade       — owner: Free → Paid (demo); JSON-only (CSRF guard)
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getBilling, listPlans, simulateUpgrade } from '../services/billing.js';

export function createPlansRouter() {
  const router = Router();
  router.get('/', async (req, res) => {
    res.json({ plans: await listPlans() });
  });
  return router;
}

export function createBillingRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req, res) => {
    res.json(await getBilling(req.user.id));
  });

  // The body is ignored on purpose: the target plan and the amount are decided by the server (E102).
  router.post('/simulate-upgrade', async (req, res) => {
    res.status(201).json(await simulateUpgrade(req.user.id));
  });

  return router;
}
