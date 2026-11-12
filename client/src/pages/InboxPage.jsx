// Owner inbox /spaces/:id/inbox (FR-07; plan.md E28–E30). Read-only in M3: moderation actions
// (edit, hide, favourite, wall, delete) arrive in M4. Locked testimonials appear only as a count.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Alert, CopyButton, publicSpaceUrl } from '../components/ui.jsx';
import { api } from '../lib/api.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favourites' },
  { id: 'on_wall', label: 'On wall' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'public', label: 'Public consent' },
];

const formatDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function Stars({ rating }) {
  if (!rating) return null;
  return (
    <span className="text-sm text-amber-500" role="img" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(rating)}<span className="text-slate-300">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function Avatar({ name, photoUrl, size = 'h-10 w-10' }) {
  if (photoUrl) return <img src={photoUrl} alt="" className={`${size} flex-none rounded-full object-cover`} />;
  const initials = name.split(/\s+/).map((p) => [...p][0] ?? '').slice(0, 2).join('').toUpperCase();
  return <span aria-hidden="true" className={`${size} flex flex-none items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700`}>{initials}</span>;
}

function Badges({ t }) {
  const badges = [];
  if (t.isFavorite) badges.push(['★ Favourite', 'bg-amber-50 text-amber-800 ring-amber-200']);
  if (t.onWall) badges.push(['On wall', 'bg-emerald-50 text-emerald-800 ring-emerald-200']);
  if (t.isHidden) badges.push(['Hidden', 'bg-slate-100 text-slate-700 ring-slate-200']);
  badges.push(t.consentPublic ? ['Public OK', 'bg-indigo-50 text-indigo-800 ring-indigo-200'] : ['Private', 'bg-white text-slate-600 ring-slate-200']);
  if (t.edited) badges.push(['Edited', 'bg-white text-slate-600 ring-slate-200']);
  return (
    <span className="flex flex-wrap gap-1.5">
      {badges.map(([label, cls]) => <span key={label} className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${cls}`}>{label}</span>)}
    </span>
  );
}

function Detail({ spaceId, testimonialId }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    api(`/spaces/${spaceId}/testimonials/${testimonialId}`, { signal: controller.signal })
      .then((data) => setState({ status: 'ready', t: data.testimonial }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: 'error', message: error.message });
      });
    return () => controller.abort();
  }, [spaceId, testimonialId]);

  if (state.status === 'loading') return <p role="status" className="p-6 text-slate-500">Loading…</p>;
  if (state.status === 'error') return <div className="p-6"><Alert>{state.message}</Alert></div>;

  const { t } = state;
  const who = [t.jobTitle, t.company].filter(Boolean).join(', ');
  return (
    <article className="p-6" aria-labelledby="detail-name">
      <div className="flex items-start gap-4">
        <Avatar name={t.name} photoUrl={t.photoUrl} size="h-16 w-16" />
        <div className="min-w-0">
          <h2 id="detail-name" className="text-xl font-semibold text-slate-900">{t.name}</h2>
          {who && <p className="text-slate-600">{who}</p>}
          <div className="mt-1"><Stars rating={t.rating} /></div>
        </div>
      </div>
      <div className="mt-4"><Badges t={{ ...t, edited: Boolean(t.editedAt) }} /></div>
      <blockquote className="mt-5 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-800">{t.body}</blockquote>

      {t.answers.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Answers</h3>
          <dl className="mt-2 space-y-3">
            {t.answers.map((a, i) => (
              <div key={i}>
                <dt className="text-sm font-medium text-slate-700">{a.question}</dt>
                <dd className="mt-0.5 whitespace-pre-line text-slate-900">{a.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Details</h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-slate-500">Email</dt>
          {/* Encoded so an address like "a@b.co?cc=…" cannot add mail headers (security review). */}
          <dd className="break-all text-slate-900"><a className="text-indigo-700 underline" href={`mailto:${encodeURIComponent(t.email)}`}>{t.email}</a></dd>
          {t.socialLink && (<>
            <dt className="text-slate-500">Link</dt>
            <dd className="break-all"><a className="text-indigo-700 underline" href={t.socialLink} target="_blank" rel="noopener noreferrer nofollow">{t.socialLink}</a></dd>
          </>)}
          <dt className="text-slate-500">Show publicly</dt>
          <dd className="text-slate-900">{t.consentPublic ? 'Yes' : 'No'}</dd>
          <dt className="text-slate-500">Share on social</dt>
          <dd className="text-slate-900">{t.consentSocial ? 'Yes' : 'No'}</dd>
          <dt className="text-slate-500">Received</dt>
          <dd className="text-slate-900">{formatDate(t.createdAt)}</dd>
        </dl>
      </section>
      <p className="mt-6 text-sm text-slate-500">Editing, hiding, favouriting, and publishing to the Wall of Love are coming next.</p>
    </article>
  );
}

/** Keyed by space id, so switching spaces starts fresh instead of showing the old space's list. */
export default function InboxPage() {
  const { id } = useParams();
  return <Inbox key={id} id={id} />;
}

function Inbox({ id }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [selectedId, setSelectedId] = useState(null);
  const [attempt, setAttempt] = useState(0); // bumped by "Try again"

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ filter });
    if (q) params.set('q', q);
    setState((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading', error: null }));
    api(`/spaces/${id}/testimonials?${params}`, { signal: controller.signal })
      .then((data) => setState({ status: 'ready', data, error: null }))
      .catch((error) => {
        // A failed refresh keeps the last list on screen and shows an inline error with a retry.
        if (error.name !== 'AbortError') setState((s) => ({ status: s.data ? 'ready' : 'error', data: s.data, error }));
      });
    return () => controller.abort();
  }, [id, filter, q, attempt]);

  if (state.status === 'loading' && !state.data) return <p role="status" className="text-slate-500">Loading inbox…</p>;
  if (state.status === 'error') {
    return (
      <div className="space-y-4">
        <Alert>{state.error.status === 404 ? 'This space does not exist or is not yours.' : state.error.message}</Alert>
        <div className="flex gap-4">
          {state.error.status !== 404 && (
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="text-indigo-700 underline">Try again</button>
          )}
          <Link to="/dashboard" className="text-indigo-700 underline">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const { data } = state;
  const { counts, plan, space, testimonials } = data;
  const selected = testimonials.some((t) => t.id === selectedId) ? selectedId : testimonials[0]?.id ?? null;
  const filtering = filter !== 'all' || q;

  return (
    <div>
      <p className="text-sm"><Link to="/dashboard" className="text-indigo-700 hover:underline">← Your spaces</Link></p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{space.title} — inbox</h1>
          <p className="mt-1 text-sm text-slate-600">
            {counts.visible} {counts.visible === 1 ? 'testimonial' : 'testimonials'}
            {counts.locked > 0 && <> · <strong>{counts.locked} locked</strong></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/s/${space.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50">
            Open public page ↗
          </a>
          <CopyButton text={publicSpaceUrl(space.slug)} />
        </div>
      </div>

      {counts.locked > 0 && (
        <div role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <strong>{counts.locked} {counts.locked === 1 ? 'testimonial is' : 'testimonials are'} locked</strong> on the {plan.name} plan, which shows {plan.maxVisible} per space.
          Upgrade to see them — the upgrade option is coming soon. Nothing has been lost: they are saved.
        </div>
      )}

      {state.error && (
        <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
          <span>Could not update the list: {state.error.message}</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold underline">Try again</button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filter testimonials" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${filter === f.id ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="ml-auto block w-full sm:w-72">
          <span className="sr-only">Search testimonials</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={100} placeholder="Search name, company, or text"
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </label>
      </div>

      {testimonials.length === 0 ? (
        <div className="mt-6 rounded-xl border-2 border-dashed border-slate-300 p-10 text-center">
          {filtering ? (
            <p className="text-slate-600">No testimonials match this filter or search.</p>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900">No testimonials yet</h2>
              <p className="mt-1 text-slate-600">Share your public link with customers to start collecting.</p>
              <div className="mt-4 flex justify-center"><CopyButton text={publicSpaceUrl(space.slug)} /></div>
            </>
          )}
        </div>
      ) : (
        <div className={`mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] ${state.status === 'refreshing' ? 'opacity-60' : ''}`} aria-busy={state.status === 'refreshing'}>
          <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200" aria-label="Testimonials">
            {testimonials.map((t) => (
              // Off-screen rows skip layout and paint (vercel-react-best-practices: rendering-content-visibility).
              <li key={t.id} className="[content-visibility:auto] [contain-intrinsic-size:auto_140px]">
                <button type="button" onClick={() => setSelectedId(t.id)} aria-current={t.id === selected ? 'true' : undefined}
                  className={`flex w-full items-start gap-3 p-4 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 ${t.id === selected ? 'bg-indigo-50/70' : ''}`}>
                  <Avatar name={t.name} photoUrl={t.photoUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-slate-900">{t.name}</span>
                      <span className="flex-none text-xs text-slate-500">{formatDate(t.createdAt)}</span>
                    </span>
                    <Stars rating={t.rating} />
                    <span className="mt-1 line-clamp-2 block text-sm text-slate-600">{t.excerpt}</span>
                    <span className="mt-2 block"><Badges t={t} /></span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-6 lg:self-start">
            {selected ? <Detail spaceId={id} testimonialId={selected} /> : null}
          </div>
        </div>
      )}
    </div>
  );
}
