// Billing demo (FR-13; plan.md E101–E103). The upgrade is a SIMULATION: no payment provider, no
// card data, nothing is charged. billing_events has CHECK (is_simulated = 1), so a real payment
// can never be recorded. The client never chooses the plan, price, or amount.
import { getPool, withTransaction } from '../db.js';
import { HttpError, notFound } from '../lib/http.js';
import { toPublicUser } from '../lib/sessions.js';

/** The only upgrade this demo offers (D6: no downgrade, no expiry). */
const FROM_PLAN = 'free';
const TO_PLAN = 'paid';

const PLAN_COLUMNS = 'code, name, price_minor, currency, billing_interval, max_spaces, max_testimonials_per_space';

const toPlan = (row) => ({
  code: row.code,
  name: row.name,
  priceMinor: row.price_minor,
  currency: row.currency,
  interval: row.billing_interval,
  maxSpaces: row.max_spaces,
  maxVisiblePerSpace: row.max_testimonials_per_space,
});

const toEvent = (row) => ({
  id: row.id,
  type: row.event_type,
  fromPlan: row.from_plan_name,
  toPlan: row.to_plan_name,
  amountMinor: row.amount_minor,
  currency: row.currency,
  simulated: row.is_simulated === 1,
  createdAt: row.created_at,
});

/** E101: all plans for the landing and billing pages, in display order. Public data only. */
export async function listPlans() {
  const [rows] = await getPool().query(`SELECT ${PLAN_COLUMNS} FROM plans ORDER BY sort_order`);
  return rows.map(toPlan);
}

async function listEvents(conn, userId) {
  const [rows] = await conn.execute(
    `SELECT b.id, b.event_type, b.amount_minor, b.currency, b.is_simulated, b.created_at,
            pf.name AS from_plan_name, pt.name AS to_plan_name
       FROM billing_events b
       JOIN plans pf ON pf.code = b.from_plan_code
       JOIN plans pt ON pt.code = b.to_plan_code
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC, b.id DESC`,
    [userId],
  );
  return rows.map(toEvent);
}

/** E103: all plans, the owner's plan, the plan they could move to (or null), and their billing history. */
export async function getBilling(userId) {
  const pool = getPool();
  const [[user]] = await pool.execute('SELECT plan_code FROM users WHERE id = ?', [userId]);
  if (!user) throw notFound();
  const plans = await listPlans();
  const plan = plans.find((p) => p.code === user.plan_code);
  const upgradeTo = user.plan_code === FROM_PLAN ? plans.find((p) => p.code === TO_PLAN) ?? null : null;
  return { plans, plan, upgradeTo, events: await listEvents(pool, userId) };
}

/**
 * E102: Free → Paid as one transaction. The owner's users row is locked, so parallel requests
 * (double click, two tabs) serialise: the first upgrades and records one event, the others see
 * Paid and get 409 with nothing written. Amount and currency come from the plans row.
 */
export async function simulateUpgrade(userId) {
  return withTransaction(async (conn) => {
    const [[user]] = await conn.execute(
      'SELECT id, name, email, plan_code FROM users WHERE id = ? FOR UPDATE',
      [userId],
    );
    if (!user) throw notFound();
    if (user.plan_code !== FROM_PLAN) {
      throw new HttpError(409, 'You are already on the Paid plan (demo).');
    }
    const [[target]] = await conn.execute(
      'SELECT code, price_minor, currency FROM plans WHERE code = ?',
      [TO_PLAN],
    );
    await conn.execute('UPDATE users SET plan_code = ? WHERE id = ?', [target.code, userId]);
    const [result] = await conn.execute(
      `INSERT INTO billing_events (user_id, event_type, from_plan_code, to_plan_code, amount_minor, currency, is_simulated)
       VALUES (?, 'upgrade_simulated', ?, ?, ?, ?, 1)`,
      [userId, FROM_PLAN, target.code, target.price_minor, target.currency],
    );
    const [events] = await conn.execute(
      `SELECT b.id, b.event_type, b.amount_minor, b.currency, b.is_simulated, b.created_at,
              pf.name AS from_plan_name, pt.name AS to_plan_name
         FROM billing_events b
         JOIN plans pf ON pf.code = b.from_plan_code
         JOIN plans pt ON pt.code = b.to_plan_code
        WHERE b.id = ?`,
      [result.insertId],
    );
    return { user: toPublicUser({ ...user, plan_code: target.code }), event: toEvent(events[0]) };
  });
}
