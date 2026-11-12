// Dashboard (M2 E10, M6 E80–E90): statistics, daily graph with a 7/30-day switch, recent activity,
// the Free-plan upgrade card, and the space cards with plan usage. Stats and spaces are fetched in
// parallel and fail independently (E90).
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../lib/api.js';
import { Alert, CopyButton, publicSpaceUrl } from '../components/ui.jsx';
import DailyChart from '../dashboard/DailyChart.jsx';
import { RecentActivity, StatTiles, UpgradeCard, UsageBar } from '../dashboard/DashboardStats.jsx';

const RANGES = [7, 30];

function SpaceCard({ space, maxVisible }) {
  const url = publicSpaceUrl(space.slug);
  const visible = space.testimonialCount - space.lockedCount;
  return (
    <li className="flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        {space.logoUrl
          ? <img src={space.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain ring-1 ring-slate-200" />
          : <span aria-hidden="true" className="h-10 w-10 rounded-lg" style={{ backgroundColor: space.brandColor }} />}
        <h3 className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">{space.title}</h3>
      </div>
      <p className="mt-3 truncate text-sm text-slate-600" title={url}>{url}</p>
      {/* E82: visible against the plan's per-space limit, plus locked ones (E31, as revised). */}
      <p className="mt-2 text-sm text-slate-600">
        <span className="tabular-nums">{visible.toLocaleString()} of {maxVisible.toLocaleString()}</span> visible
        {space.lockedCount > 0 && <span className="font-medium text-amber-700"> · {space.lockedCount} locked</span>}
      </p>
      <div className="mt-1.5"><UsageBar used={visible} max={maxVisible} label={`Visible testimonials in ${space.title}`} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/spaces/${space.id}/inbox`} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Inbox<span className="sr-only"> for {space.title}</span>
        </Link>
        <Link to={`/spaces/${space.id}/edit`} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50">
          Edit<span className="sr-only"> {space.title}</span>
        </Link>
        {/* M5 (E62/E76): the embed builder, linked here once M6's dashboard was merged. */}
        <Link to={`/spaces/${space.id}/embed`} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50">
          Embed<span className="sr-only"> {space.title} on your site</span>
        </Link>
        <CopyButton text={url} />
      </div>
    </li>
  );
}

/** E85: the range lives in the URL (?range=30) so refresh and Back keep it. */
function useRange() {
  const [params, setParams] = useSearchParams();
  const days = Number(params.get('range')) === 30 ? 30 : 7;
  const setDays = (d) => setParams(d === 7 ? {} : { range: String(d) });
  return [days, setDays];
}

function Stats({ days, setDays }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    // E93: the IANA zone (e.g. "Asia/Dhaka"), so the server respects daylight-saving changes.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setState((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading', error: '' }));
    api(`/dashboard?days=${days}&tz=${encodeURIComponent(tz)}`, { signal: controller.signal })
      .then((data) => setState({ status: 'ready', data, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((s) => ({ status: 'error', data: s.data, error: error.message }));
      });
    return () => controller.abort();
  }, [days, attempt]);

  if (!state.data) {
    if (state.status === 'error') {
      return (
        <div className="flex flex-wrap items-center gap-3">
          <Alert>Could not load your statistics: {state.error}</Alert>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="text-sm font-medium text-indigo-700 underline">Try again</button>
        </div>
      );
    }
    return <p role="status" className="text-slate-500">Loading statistics…</p>;
  }

  const { plan, upgradeTo, totals, daily, recent } = state.data;
  const shownDays = daily.length; // the data on screen (may lag the selector while refreshing)
  return (
    <div className="space-y-6">
      <StatTiles plan={plan} totals={totals} days={shownDays} />

      {state.status === 'error' && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
          <span>Could not update the statistics: {state.error}</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold underline">Try again</button>
        </div>
      )}

      <section aria-labelledby="graph-heading" className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="graph-heading" className="text-base font-semibold text-slate-900">Testimonials per day</h2>
          <div role="group" aria-label="Time range" className="inline-flex rounded-lg bg-slate-100 p-1">
            {RANGES.map((d) => (
              <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}
                className={`rounded-md px-3 py-1 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${days === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                {d} days
              </button>
            ))}
          </div>
        </div>
        <div className={`mt-4 transition-opacity ${state.status === 'refreshing' ? 'opacity-50' : ''}`} aria-busy={state.status === 'refreshing'}>
          <DailyChart key={shownDays} daily={daily} days={shownDays} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="activity-heading" className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 id="activity-heading" className="text-base font-semibold text-slate-900">Recent activity</h2>
          <div className="mt-2"><RecentActivity recent={recent} planName={plan.name} /></div>
        </section>
        <UpgradeCard plan={plan} upgradeTo={upgradeTo} totals={totals} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useRange();
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    api('/spaces', { signal: controller.signal })
      .then((data) => setState({ status: 'ready', data, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: 'error', data: null, error: error.message });
      });
    return () => controller.abort();
  }, []);

  const usage = state.data?.usage;
  const atLimit = usage ? usage.spacesUsed >= usage.spacesMax : false;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          {usage && <p className="mt-1 text-sm text-slate-600">You are on the <strong>{usage.planName}</strong> plan</p>}
        </div>
        {usage && (
          <div className="text-right">
            {atLimit ? (
              <>
                <button type="button" disabled aria-describedby="space-limit-note" className="cursor-not-allowed rounded-lg bg-indigo-300 px-4 py-2 text-sm font-medium text-white">
                  Create space
                </button>
                <p id="space-limit-note" className="mt-1 max-w-xs text-xs text-slate-600">
                  You have reached the {usage.planName} plan limit of {usage.spacesMax} spaces.{' '}
                  {state.data?.upgradeTo ? <><Link to="/billing" className="font-medium text-indigo-700 underline">Upgrade to Paid (demo)</Link> or delete a space to make room.</> : 'Delete a space to make room.'}
                </p>
              </>
            ) : (
              <Link to="/spaces/new" className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Create space
              </Link>
            )}
          </div>
        )}
      </div>

      <Stats days={days} setDays={setDays} />

      <section aria-labelledby="spaces-heading">
        <h2 id="spaces-heading" className="text-lg font-semibold text-slate-900">Your spaces</h2>
        {state.status === 'loading' && <p role="status" className="mt-3 text-slate-500">Loading your spaces…</p>}
        {state.status === 'error' && <div className="mt-3"><Alert>{state.error}</Alert></div>}
        {state.status === 'ready' && (state.data.spaces.length === 0 ? (
          <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 p-10 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No spaces yet</h3>
            <p className="mt-1 text-slate-600">Create a space to get a public link where customers can leave testimonials.</p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.data.spaces.map((space) => <SpaceCard key={space.id} space={space} maxVisible={usage.maxVisiblePerSpace} />)}
          </ul>
        ))}
      </section>
    </div>
  );
}
