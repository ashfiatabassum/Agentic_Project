// Dashboard statistics pieces (M6): stat tiles (E81–E82), recent activity (E87), and the Free-plan
// upgrade card (E88). All numbers come from GET /api/dashboard; nothing is counted in the browser.
import { Link } from 'react-router';
import { formatPrice } from './chartMath.js';

const number = (n) => n.toLocaleString();

/** Thin usage bar (dataviz: 8 px, rounded); amber from 80 %, red at the limit (E82). */
export function UsageBar({ used, max, label }) {
  const share = max > 0 ? Math.min(1, used / max) : 0;
  const tone = share >= 1 ? 'bg-red-600' : share >= 0.8 ? 'bg-amber-500' : 'bg-indigo-600';
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={used}
      aria-valuetext={`${number(used)} of ${number(max)}`} className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${share * 100}%` }} />
    </div>
  );
}

function Tile({ label, value, children }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {children ? <div className="mt-2 text-sm text-slate-600">{children}</div> : null}
    </div>
  );
}

export function StatTiles({ plan, totals, days }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label="Spaces" value={`${totals.spaces} of ${plan.maxSpaces}`}>
        <UsageBar used={totals.spaces} max={plan.maxSpaces} label={`Spaces used on the ${plan.name} plan`} />
      </Tile>
      <Tile label="Testimonials" value={number(totals.testimonials)}>
        {number(totals.visible)} visible
      </Tile>
      <Tile label="Locked" value={number(totals.locked)}>
        {totals.locked > 0
          ? <span className="font-medium text-amber-700">Past the {plan.name} limit</span>
          : `Limit ${number(plan.maxVisiblePerSpace)} per space`}
      </Tile>
      <Tile label={`Received, last ${days} days`} value={number(totals.inPeriod)} />
    </div>
  );
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS = [['day', 86_400], ['hour', 3_600], ['minute', 60]];

/** "2 hours ago"; the exact time is in the title attribute. */
export function relativeTime(iso, now = Date.now()) {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

function describe(event, planName) {
  if (event.type === 'upgrade') return <>Upgraded to the <strong>{event.planName}</strong> plan (demo)</>;
  if (event.type === 'space') return <>Space <strong>{event.spaceTitle}</strong> created</>;
  if (event.locked) {
    // E87: a locked testimonial's content, including the name, stays hidden.
    return <>A new testimonial arrived in <strong>{event.spaceTitle}</strong> <span className="text-amber-700">(locked on the {planName} plan)</span></>;
  }
  return <>New testimonial from <strong>{event.name}</strong> in <strong>{event.spaceTitle}</strong></>;
}

export function RecentActivity({ recent, planName }) {
  if (recent.length === 0) return <p className="text-sm text-slate-600">No activity yet.</p>;
  return (
    <ol className="divide-y divide-slate-100">
      {recent.map((event, i) => {
        const text = <span className="text-slate-800">{describe(event, planName)}</span>;
        return (
          // Events have no stable public id (testimonial ids are not sent); the list is replaced as a whole.
          <li key={`${event.type}-${event.at}-${i}`} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
            {event.spaceId
              ? <Link to={`/spaces/${event.spaceId}/inbox`} className="min-w-0 hover:underline">{text}</Link>
              : <span className="min-w-0">{text}</span>}
            <time dateTime={event.at} title={new Date(event.at).toLocaleString()} className="flex-none text-xs text-slate-500">
              {relativeTime(event.at)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}

/** E88 as revised by E93: shown while a higher plan exists; every figure comes from the plans table. */
export function UpgradeCard({ plan, upgradeTo, totals }) {
  if (!upgradeTo) return null;
  const price = formatPrice(upgradeTo.priceMinor, upgradeTo.currency);
  return (
    <section aria-labelledby="upgrade-heading" className="self-start rounded-xl bg-indigo-50 p-5 ring-1 ring-indigo-200">
      <h2 id="upgrade-heading" className="text-base font-semibold text-indigo-950">You&apos;re on the {plan.name} plan</h2>
      <p className="mt-1 text-sm text-indigo-900">
        {plan.maxSpaces} spaces and {number(plan.maxVisiblePerSpace)} visible testimonials per space.
        {totals.locked > 0 && <> <strong>{number(totals.locked)} {totals.locked === 1 ? 'testimonial is' : 'testimonials are'} locked</strong> — they are saved and unlock when you upgrade.</>}
      </p>
      <p className="mt-2 text-sm text-indigo-900">
        <strong>{upgradeTo.name} (demo)</strong>: {price}{upgradeTo.interval ? ` per ${upgradeTo.interval}` : ''} · {upgradeTo.maxSpaces} spaces · {number(upgradeTo.maxVisiblePerSpace)} testimonials per space.
      </p>
      <Link to="/billing" className="mt-3 inline-block rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
        Upgrade (demo)
      </Link>
    </section>
  );
}
