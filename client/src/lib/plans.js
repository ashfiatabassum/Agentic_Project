// Plan facts shown on the landing page (E19). They mirror the `plans` seed rows in
// server/db/migrations/001_create_plans.sql; the server enforces the real limits.
// If a GET /api/plans endpoint is added later (billing milestone), read from it instead.
export const PLANS = [
  {
    code: 'free',
    name: 'Free',
    price: '৳0',
    period: 'forever',
    blurb: 'Everything you need to start collecting.',
    features: ['3 spaces', '100 testimonials per space', 'Wall of Love and embed', 'Custom questions and fields'],
  },
  {
    code: 'paid',
    name: 'Paid',
    price: '৳999',
    period: 'per month',
    blurb: 'For growing brands with more to show.',
    features: ['25 spaces', '1,000 testimonials per space', 'Everything in Free', 'Unlocks testimonials past the Free limit'],
    note: 'Demo — no real payment',
  },
];
