// Billing demo (FR-13; plan.md E104–E107). Everything here is a SIMULATION: no payment is taken,
// no card details are asked for, and there are no payment inputs on these pages. The server
// decides the plan and the amount; the browser only asks for the simulated upgrade.
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import Breadcrumbs, { SPACES_CRUMB } from '../components/Breadcrumbs.jsx';
import { Alert, Button } from '../components/ui.jsx';
import { formatPrice } from '../dashboard/chartMath.js';
import { api } from '../lib/api.js';
import { planView } from '../lib/plans.js';

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

function DemoBanner() {
  return (
    <div role="note" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-300">
      <strong>Demo billing.</strong> This is a simulation: no payment is taken and no card details are asked for.
    </div>
  );
}

/** E104: confirmation in the style of the delete dialogs (native <dialog>: focus trapped, Escape cancels). */
function UpgradeDialog({ open, plan, busy, error, onCancel, onConfirm }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // While the request is running, Escape must not close the dialog (code-reviewer).
    <dialog ref={ref} onClose={onCancel} onCancel={(e) => { if (busy) e.preventDefault(); }} aria-labelledby="upgrade-title" aria-describedby="upgrade-desc"
      className="m-auto w-full max-w-md rounded-2xl p-6 shadow-xl backdrop:bg-slate-900/50">
      <form method="dialog" onSubmit={(e) => { e.preventDefault(); onConfirm(); }} className="space-y-4">
        <h2 id="upgrade-title" className="text-lg font-semibold text-slate-900">Simulate the upgrade to {plan.name}?</h2>
        <p id="upgrade-desc" className="text-sm text-slate-700">
          This is a <strong>simulation</strong>. Nothing will be charged and no payment details are needed.
          Your plan changes to {plan.name} (demo) right away: {plan.maxSpaces} spaces and {plan.maxVisiblePerSpace.toLocaleString('en')} visible testimonials per space.
        </p>
        <Alert>{error}</Alert>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => ref.current.close()} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Upgrading…' : 'Confirm simulated upgrade'}</Button>
        </div>
      </form>
    </dialog>
  );
}

function PlanCard({ plan, current }) {
  const view = planView(plan);
  return (
    <section aria-labelledby={`plan-${plan.code}`}
      className={`flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ${current ? 'ring-2 ring-indigo-500' : 'ring-slate-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={`plan-${plan.code}`} className="text-lg font-semibold text-slate-900">{plan.name}</h2>
        {current && <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">Your plan</span>}
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tracking-tight text-slate-900">{view.price}</span>
        <span className="text-sm text-slate-500">{view.period}{plan.priceMinor > 0 && ' (demo price)'}</span>
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
        {view.features.map((f) => <li key={f}>✓ {f}</li>)}
      </ul>
    </section>
  );
}

function History({ events }) {
  return (
    <section aria-labelledby="history-heading" className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 id="history-heading" className="text-lg font-semibold text-slate-900">Billing history</h2>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No billing events yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <span className="text-slate-800">
                {e.fromPlan} → <strong>{e.toPlan}</strong> · {formatPrice(e.amountMinor, e.currency)}{' '}
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">simulated, not charged</span>
              </span>
              <time dateTime={e.createdAt} className="text-slate-500">{dateFormat.format(new Date(e.createdAt))}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function BillingPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [state, setState] = useState({ status: 'loading', data: null, locked: 0, error: '' });
  const [dialog, setDialog] = useState({ open: false, busy: false, error: '' });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const { signal } = controller;
    // Independent reads in parallel (vercel-react-best-practices: async-parallel). GET /billing
    // includes the plan list; the locked count is only a hint about what the upgrade unlocks.
    Promise.all([
      api('/billing', { signal }),
      api(`/dashboard?days=7&tz=${encodeURIComponent(tz)}`, { signal }).catch((e) => (e.name === 'AbortError' ? Promise.reject(e) : null)),
    ])
      .then(([data, dashboard]) => setState({ status: 'ready', data, locked: dashboard?.totals.locked ?? 0, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((s) => ({ ...s, status: 'error', error: error.message }));
      });
    return () => controller.abort();
  }, [reload]);

  async function confirmUpgrade() {
    setDialog({ open: true, busy: true, error: '' });
    try {
      const { user } = await api('/billing/simulate-upgrade', { method: 'POST', body: {} });
      updateUser(user);
      navigate('/billing/success', { replace: true, state: { unlocked: state.locked } });
    } catch (error) {
      if (error.status === 409) {
        // Already upgraded (for example in another tab): show the real state instead of a stale Free page.
        const { user } = await api('/auth/me').catch(() => ({ user: null }));
        if (user) updateUser(user);
        setDialog({ open: false, busy: false, error: '' });
        setReload((n) => n + 1);
        return;
      }
      setDialog({ open: true, busy: false, error: error.message });
    }
  }

  if (state.status === 'loading') return <p role="status" className="text-slate-500">Loading…</p>;
  if (state.status === 'error') {
    return (
      <div>
        <Breadcrumbs items={[SPACES_CRUMB, { label: 'Billing' }]} />
        <Alert>{state.error}</Alert>
      </div>
    );
  }

  const { plan, upgradeTo, events } = state.data;
  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[SPACES_CRUMB, { label: 'Billing' }]} />
        <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">You are on the <strong>{plan.name}</strong> plan{plan.code === 'paid' && ' (demo)'}.</p>
      </div>
      <DemoBanner />

      <div className="grid gap-4 md:grid-cols-2">
        {state.data.plans.map((p) => <PlanCard key={p.code} plan={p} current={p.code === plan.code} />)}
      </div>

      {upgradeTo ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-indigo-50 p-5 ring-1 ring-indigo-200">
          <p className="flex-1 text-sm text-indigo-950">
            {state.locked > 0 && <><strong>{state.locked.toLocaleString('en')} locked {state.locked === 1 ? 'testimonial' : 'testimonials'}</strong> would unlock. </>}
            Try {upgradeTo.name} for this demo — nothing is charged.
          </p>
          <Button onClick={() => setDialog({ open: true, busy: false, error: '' })}>Simulate upgrade to {upgradeTo.name}</Button>
        </div>
      ) : (
        <p className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-900 ring-1 ring-emerald-200">
          You&apos;re on the {plan.name} plan (demo). There is no downgrade in this demo.
        </p>
      )}

      <History events={events} />

      {upgradeTo && (
        <UpgradeDialog open={dialog.open} plan={upgradeTo} busy={dialog.busy} error={dialog.error}
          onCancel={() => setDialog({ open: false, busy: false, error: '' })} onConfirm={confirmUpgrade} />
      )}
    </div>
  );
}

/** E105: shown after a simulated upgrade; on Free (or opened directly) it goes back to /billing. */
export function BillingSuccessPage() {
  const { user } = useAuth();
  const location = useLocation();
  const heading = useRef(null);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api('/billing', { signal: controller.signal })
      .then((data) => setPlan(data.plan))
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (plan) heading.current?.focus(); }, [plan]);

  if (user.plan !== 'paid') return <Navigate to="/billing" replace />;
  // review-react-ui: a failed read shows the error instead of "Loading…" forever.
  if (error) return <Alert>{error}</Alert>;
  if (!plan) return <p role="status" className="text-slate-500">Loading…</p>;

  const unlocked = Number(location.state?.unlocked) || 0;
  return (
    <div>
      <Breadcrumbs items={[SPACES_CRUMB, { label: 'Billing', to: '/billing' }, { label: 'Upgraded' }]} />
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-4xl" aria-hidden="true">🎉</p>
        <h1 ref={heading} tabIndex={-1} className="mt-2 text-2xl font-semibold text-slate-900 focus:outline-none">
          You&apos;re on the {plan.name} plan (demo)
        </h1>
        <p className="mt-2 text-slate-700">
          You can now have {plan.maxSpaces} spaces and {plan.maxVisiblePerSpace.toLocaleString('en')} visible testimonials per space.
          {unlocked > 0 && <> <strong>{unlocked.toLocaleString('en')} locked {unlocked === 1 ? 'testimonial is' : 'testimonials are'} now visible.</strong></>}
        </p>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200">
          Simulated upgrade: no money was charged and no payment details were collected.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Go to dashboard</Link>
          <Link to="/billing" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50">View billing</Link>
        </div>
      </div>
    </div>
  );
}
