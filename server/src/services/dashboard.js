// Dashboard statistics (M6, FR-11; plan.md E80–E87, revised by E93). Everything is scoped to the
// signed-in owner (owner_id from the session); nothing here is public.
import { withTransaction } from '../db.js';
import { Validator } from '../lib/validate.js';

export const RANGES = [7, 30];
const ACTIVITY_LIMIT = 10;
const BUCKET_SECONDS = 900; // 15 minutes: every real UTC offset is a multiple of 15 minutes
const DAY_MS = 86_400_000;

// ---------------------------------------------------------------- time zones (E84 as revised by E93)

const formatters = new Map();
/** Cached Intl formatter for an IANA zone; throws RangeError for an unknown zone. */
function formatter(timeZone) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

function wallClock(timeZone, ms) {
  const p = Object.fromEntries(formatter(timeZone).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour), min: Number(p.minute), s: Number(p.second) };
}

/** The zone's offset from UTC in minutes at that instant (daylight saving included). */
export function offsetAt(timeZone, ms) {
  const w = wallClock(timeZone, ms);
  const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.min, w.s);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000);
}

const pad = (n) => String(n).padStart(2, '0');
/** The owner's local calendar date ('YYYY-MM-DD') of an instant. */
export function localDate(timeZone, ms) {
  const w = wallClock(timeZone, ms);
  return `${w.y}-${pad(w.m)}-${pad(w.d)}`;
}

/** The UTC instant at which a local date starts in the zone (handles a changed offset that day). */
function startOfLocalDay(timeZone, isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let start = guess - offsetAt(timeZone, guess) * 60_000;
  const corrected = guess - offsetAt(timeZone, start) * 60_000;
  if (corrected !== start) start = corrected;
  return start;
}

/**
 * The last `days` local days including today, as 'YYYY-MM-DD', and the UTC instant at which the
 * first of them starts in the owner's zone.
 */
export function localDays(days, timeZone, now = Date.now()) {
  const [y, m, d] = localDate(timeZone, now).split('-').map(Number);
  const today = Date.UTC(y, m - 1, d); // calendar arithmetic only; no zone involved
  const dates = Array.from({ length: days }, (_, i) => new Date(today - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10));
  return { dates, fromUtc: new Date(startOfLocalDay(timeZone, dates[0])) };
}

/**
 * E80, E93: days = 7 | 30 (default 7); tz = the owner's IANA time zone as the browser reports it
 * (Intl.DateTimeFormat().resolvedOptions().timeZone, for example "Asia/Dhaka"; default "UTC").
 */
export function parseDashboardQuery(query) {
  const v = new Validator();
  let days = 7;
  if (query.days !== undefined) {
    days = Number(query.days);
    if (!RANGES.includes(days) || String(days) !== query.days) v.error('days', 'days must be 7 or 30');
  }
  let tz = 'UTC';
  if (query.tz !== undefined) {
    tz = query.tz;
    let known = typeof tz === 'string' && tz.length <= 64 && /^[A-Za-z0-9_+\-/]+$/.test(tz);
    if (known) {
      try {
        formatter(tz);
      } catch {
        known = false;
      }
    }
    if (!known) v.error('tz', 'tz must be an IANA time zone such as Asia/Dhaka');
  }
  v.assert();
  return { days, tz };
}

// ---------------------------------------------------------------- statistics

/** E81: per-space counts → totals, using the accept-but-lock rule (oldest N visible per space). */
function summarise(spaceCounts, maxVisible) {
  let testimonials = 0;
  let visible = 0;
  for (const { n } of spaceCounts) {
    testimonials += n;
    visible += Math.min(n, maxVisible);
  }
  return { spaces: spaceCounts.length, testimonials, visible, locked: testimonials - visible };
}

const isAfter = (row, edge) => row.created_at > edge.created_at
  || (row.created_at.getTime() === edge.created_at.getTime() && row.ref_id > edge.id);

/**
 * All reads run in **one** read transaction, so they see the same snapshot (E93: a submission
 * arriving mid-request can no longer make the totals and the locked labels disagree).
 */
export async function getDashboard(ownerId, { days, tz }) {
  const { dates, fromUtc } = localDays(days, tz);

  return withTransaction(async (conn) => {
    const [[plan]] = await conn.execute(
      `SELECT p.code, p.name, p.max_spaces, p.max_testimonials_per_space, p.sort_order
         FROM users u JOIN plans p ON p.code = u.plan_code WHERE u.id = ?`,
      [ownerId],
    );
    const maxVisible = plan.max_testimonials_per_space;
    if (!Number.isInteger(maxVisible) || maxVisible < 1) throw new Error('Invalid plan limit');

    // E88 (revised by E93): the next plan up comes from the plans table, not from the client.
    const [[next]] = await conn.execute(
      `SELECT name, price_minor, currency, billing_interval, max_spaces, max_testimonials_per_space
         FROM plans WHERE sort_order > ? ORDER BY sort_order LIMIT 1`,
      [plan.sort_order],
    );

    const [spaceRows] = await conn.execute(
      `SELECT s.id, COUNT(t.id) AS n
         FROM spaces s LEFT JOIN testimonials t ON t.space_id = s.id
        WHERE s.owner_id = ?
        GROUP BY s.id`,
      [ownerId],
    );
    const spaceCounts = spaceRows.map((r) => ({ id: r.id, n: Number(r.n) }));
    const totals = summarise(spaceCounts, maxVisible);

    // E83, E93: all saved testimonials (hidden and locked included) in 15-minute UTC buckets; each
    // bucket is mapped to the owner's local date in Node, so daylight-saving changes are respected.
    // UNIX_TIMESTAMP reads the DATETIME in the session zone, which is UTC (E92).
    const [bucketRows] = await conn.execute(
      `SELECT FLOOR(UNIX_TIMESTAMP(t.created_at) / ${BUCKET_SECONDS}) AS bucket, COUNT(*) AS n
         FROM testimonials t JOIN spaces s ON s.id = t.space_id
        WHERE s.owner_id = ? AND t.created_at >= ?
        GROUP BY bucket`,
      [ownerId, fromUtc],
    );
    const byDay = new Map();
    for (const r of bucketRows) {
      const day = localDate(tz, Number(r.bucket) * BUCKET_SECONDS * 1000);
      byDay.set(day, (byDay.get(day) ?? 0) + Number(r.n));
    }
    const daily = dates.map((date) => ({ date, count: byDay.get(date) ?? 0 }));
    totals.inPeriod = daily.reduce((sum, d) => sum + d.count, 0);

    // E87 / data-model D8: recent activity is derived, never stored. The testimonial branch takes
    // the newest 10 per space through the (space_id, created_at) index (LATERAL, MySQL ≥ 8.0.14).
    const [activityRows] = await conn.query(
      `(SELECT 'testimonial' AS kind, t.id AS ref_id, s.id AS space_id, s.title AS space_title,
               t.name AS name, NULL AS plan_name, t.created_at
          FROM spaces s
          JOIN LATERAL (SELECT t.id, t.name, t.created_at FROM testimonials t
                         WHERE t.space_id = s.id ORDER BY t.created_at DESC, t.id DESC LIMIT ${ACTIVITY_LIMIT}) t ON TRUE
         WHERE s.owner_id = ? ORDER BY t.created_at DESC, t.id DESC LIMIT ${ACTIVITY_LIMIT})
       UNION ALL
       (SELECT 'space', s.id, s.id, s.title, NULL, NULL, s.created_at
          FROM spaces s WHERE s.owner_id = ? ORDER BY s.created_at DESC, s.id DESC LIMIT ${ACTIVITY_LIMIT})
       UNION ALL
       (SELECT 'upgrade', b.id, NULL, NULL, NULL, p.name, b.created_at
          FROM billing_events b JOIN plans p ON p.code = b.to_plan_code
         WHERE b.user_id = ? ORDER BY b.created_at DESC, b.id DESC LIMIT ${ACTIVITY_LIMIT})
       ORDER BY created_at DESC, kind, ref_id DESC
       LIMIT ${ACTIVITY_LIMIT}`,
      [ownerId, ownerId, ownerId],
    );

    // For each space past its limit: the (created_at, id) of its last visible testimonial; anything
    // newer is locked. Same snapshot as the counts above. maxVisible is a validated integer
    // (inlined because mysql2's prepared statements reject LIMIT/OFFSET parameters).
    const lastVisible = new Map();
    for (const s of spaceCounts.filter((x) => x.n > maxVisible)) {
      const [[edge]] = await conn.execute(
        `SELECT created_at, id FROM testimonials WHERE space_id = ? ORDER BY created_at, id LIMIT 1 OFFSET ${maxVisible - 1}`,
        [s.id],
      );
      lastVisible.set(s.id, edge);
    }

    const recent = activityRows.map((r) => {
      if (r.kind === 'upgrade') return { type: 'upgrade', planName: r.plan_name, at: r.created_at };
      if (r.kind === 'space') return { type: 'space', spaceId: r.space_id, spaceTitle: r.space_title, at: r.created_at };
      const edge = lastVisible.get(r.space_id);
      const locked = Boolean(edge) && isAfter(r, edge);
      // A locked testimonial's content (including the name) stays hidden (PRD §5).
      return { type: 'testimonial', spaceId: r.space_id, spaceTitle: r.space_title, name: locked ? null : r.name, locked, at: r.created_at };
    });

    return {
      plan: { code: plan.code, name: plan.name, maxSpaces: plan.max_spaces, maxVisiblePerSpace: maxVisible },
      upgradeTo: next ? {
        name: next.name,
        priceMinor: next.price_minor,
        currency: next.currency,
        interval: next.billing_interval,
        maxSpaces: next.max_spaces,
        maxVisiblePerSpace: next.max_testimonials_per_space,
      } : null,
      totals,
      range: { days, tz },
      daily,
      recent,
    };
  });
}
