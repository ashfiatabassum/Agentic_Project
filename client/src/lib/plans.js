// Plans for the landing and billing pages (M7, E101). Limits, prices and currency come from
// GET /api/plans (the `plans` table), never from a copy in the client; only the marketing text
// below lives here. The server enforces the real limits.
import { useEffect, useState } from 'react';
import { formatPrice } from '../dashboard/chartMath.js';
import { api } from './api.js';

const COPY = {
  free: { blurb: 'Everything you need to start collecting.', extras: ['Wall of Love and embed', 'Custom questions and fields'] },
  paid: { blurb: 'For growing brands with more to show.', extras: ['Everything in Free', 'Unlocks testimonials past the Free limit'], note: 'Demo — no real payment' },
};

const number = (n) => n.toLocaleString('en');

/** Display fields for one plan from the API. */
export function planView(plan) {
  const copy = COPY[plan.code] ?? { blurb: '', extras: [] };
  return {
    ...plan,
    price: formatPrice(plan.priceMinor, plan.currency),
    period: plan.interval ? `per ${plan.interval}` : 'forever',
    blurb: copy.blurb,
    note: copy.note,
    features: [`${number(plan.maxSpaces)} spaces`, `${number(plan.maxVisiblePerSpace)} visible testimonials per space`, ...copy.extras],
  };
}

/** { status: 'loading' | 'ready' | 'error', plans } from GET /api/plans (public). */
export function usePlans() {
  const [state, setState] = useState({ status: 'loading', plans: [] });
  useEffect(() => {
    const controller = new AbortController();
    api('/plans', { signal: controller.signal })
      .then((data) => setState({ status: 'ready', plans: data.plans.map(planView) }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: 'error', plans: [] });
      });
    return () => controller.abort();
  }, []);
  return state;
}
