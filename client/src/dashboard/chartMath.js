// Pure helpers for the dashboard (M6), kept free of React so `npm run test:client` can test them
// with node:test (E93; code review: "the tick helper is untested").

/** Smallest "nice" axis maximum ≥ max, with whole-number ticks at 0, ½ and the top (0…4 when small). */
export function niceMax(max) {
  if (max <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(max));
  // Only multiples whose half is a whole number, so the middle tick is never 2.5 or 12.5.
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= max && (m * step) % 2 === 0) return m * step;
  return 10 * step;
}

/** Axis ticks for niceMax's result. */
export const ticksFor = (top) => (top === 4 ? [0, 1, 2, 3, 4] : [0, top / 2, top]);

const asDate = (iso) => new Date(`${iso}T00:00:00Z`); // the API's dates are already the owner's local days
export const fmtDay = (iso, opts) => asDate(iso).toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });
export const dayLabel = (iso) => fmtDay(iso, { day: 'numeric', month: 'short' });
export const plural = (n) => `${n} ${n === 1 ? 'testimonial' : 'testimonials'}`;

/** One-sentence summary for screen readers and the caption (E86). */
export function summarise(daily, days) {
  const total = daily.reduce((s, d) => s + d.count, 0);
  if (total === 0) return `No testimonials in the last ${days} days.`;
  const busiest = daily.reduce((a, b) => (b.count > a.count ? b : a));
  return `${plural(total)} in the last ${days} days; busiest day ${dayLabel(busiest.date)} with ${busiest.count}.`;
}

/** Show every k-th date label so labels get about `px` pixels each; the last (today) always shows. */
export const labelStep = (count, innerWidth, px = 52) => Math.max(1, Math.ceil(count / Math.max(1, Math.floor(innerWidth / px))));

/** A price in minor units, e.g. 99900 BDT → "৳999" (no decimals for whole amounts). */
export function formatPrice(minor, currency) {
  const amount = minor / 100;
  return new Intl.NumberFormat('en', {
    style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
