// Public Wall of Love /s/:slug/wall (FR-09; plan.md E48–E49). No login. The server returns only
// eligible testimonials (on the wall, not hidden, public consent, not locked) and no private data.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../lib/api.js';
import PublicShell from '../public/PublicShell.jsx';
import WallCard from '../public/WallCard.jsx';
import { themeVars } from '../public/publicTheme.js';

const cardClass = 'rounded-2xl bg-[var(--card)] p-10 text-center shadow-sm ring-1 ring-[var(--border)]';

export default function WallPage() {
  const { slug } = useParams();
  const [load, setLoad] = useState({ status: 'loading', data: null, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    setLoad({ status: 'loading', data: null, error: '' });
    api(`/public/spaces/${encodeURIComponent(slug)}/wall`, { signal: controller.signal })
      .then((data) => setLoad({ status: 'ready', data, error: '' }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setLoad({ status: error.status === 404 ? 'missing' : 'error', data: null, error: error.message });
      });
    return () => controller.abort();
  }, [slug]);

  const space = load.data?.space;
  const vars = themeVars(space?.themeCode, space?.brandColor);

  if (load.status === 'loading') {
    return <PublicShell vars={vars}><p role="status" className="text-center text-[var(--muted)]">Loading…</p></PublicShell>;
  }
  if (load.status === 'missing') {
    return (
      <PublicShell vars={vars}>
        <div className={cardClass}>
          <h1 className="text-2xl font-semibold">This page doesn&apos;t exist</h1>
          <p className="mt-2 text-[var(--muted)]">Check the link you were given — it may have changed.</p>
        </div>
      </PublicShell>
    );
  }
  if (load.status === 'error') {
    return (
      <PublicShell vars={vars}>
        <div role="alert" className={cardClass}>
          <h1 className="text-xl font-semibold">We could not load this page</h1>
          <p className="mt-2 text-[var(--muted)]">{load.error}</p>
        </div>
      </PublicShell>
    );
  }

  const { testimonials } = load.data;
  return (
    <PublicShell vars={vars} width="max-w-6xl">
      <header className="text-center">
        {space.logoUrl
          ? <img src={space.logoUrl} alt={`${space.title} logo`} className="mx-auto h-16 w-16 rounded-2xl bg-[var(--card)] object-contain p-1 shadow-sm ring-1 ring-[var(--border)]" />
          : <span aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand)] text-2xl font-bold text-[var(--on-brand)]">{[...space.title][0]?.toUpperCase()}</span>}
        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{space.title} — Wall of Love</h1>
        {space.subtitle && <p className="mx-auto mt-2 max-w-2xl whitespace-pre-line text-lg text-[var(--muted)]">{space.subtitle}</p>}
        <Link to={`/s/${space.slug}`}
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-[var(--on-brand)] shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">
          Share your own experience
        </Link>
      </header>

      {testimonials.length === 0 ? (
        <div className={`mt-10 ${cardClass}`}>
          <p className="text-lg text-[var(--muted)]">No testimonials here yet.</p>
        </div>
      ) : (
        // Columns (masonry-like) keep cards of different lengths tidy: 1 at 375 px, up to 3 on desktop.
        <ul className="mt-10 gap-6 sm:columns-2 lg:columns-3" aria-label="Testimonials">
          {testimonials.map((t, i) => (
            // The wall has no ids (E48: none are exposed); the list is static, so the index is a stable key.
            <li key={i} className="mb-6 break-inside-avoid"><WallCard testimonial={t} /></li>
          ))}
        </ul>
      )}
    </PublicShell>
  );
}
