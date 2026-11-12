// Public embed /embed/:slug (FR-10; plan.md E61, E65–E67). Shown inside an <iframe> on other
// sites. It reads the same public wall API as /s/:slug/wall (E48), so it can never show more
// than the wall: only on-wall, visible, consented, unlocked testimonials and no private data.
// Settings come only from the URL and are whitelisted (embedSettings.js).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { api } from '../lib/api.js';
import WallCard from '../public/WallCard.jsx';
import { textOn, themeVars } from '../public/publicTheme.js';
import { parseEmbedSettings, RESIZE_MESSAGE } from '../embed/embedSettings.js';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** E65: tell the host page how tall the content is. Only a number is sent, so '*' leaks nothing. */
function useReportHeight(ref) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.parent === window) return undefined;
    const send = () => window.parent.postMessage({ type: RESIZE_MESSAGE, height: Math.ceil(el.getBoundingClientRect().height) }, '*');
    send();
    const observer = new ResizeObserver(send);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

/** Entrance animation (E67): CSS class .embed-rise only runs when reduced motion is not requested. */
function Item({ animate, index, className = '', children }) {
  return (
    <li className={`${className} ${animate ? 'embed-rise' : ''}`}
      style={animate ? { animationDelay: `${Math.min(index, 8) * 60}ms` } : undefined}>
      {children}
    </li>
  );
}

function Carousel({ testimonials, animate }) {
  const listRef = useRef(null);
  // { left, at }: where a smooth scroll is heading. A second click during the scroll steps on from there;
  // stepping from the half-way position would let scroll-snap pull it back to the same card.
  const targetRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = () => {
    const el = listRef.current;
    if (!el) return;
    if (targetRef.current && Math.abs(el.scrollLeft - targetRef.current.left) < 2) targetRef.current = null;
    const start = el.scrollLeft <= 1;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  };

  useEffect(() => {
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(listRef.current);
    return () => observer.disconnect();
  }, []);

  const move = (direction) => {
    // aria-disabled instead of disabled, so a keyboard user's focus stays on the button at the ends.
    if (direction < 0 ? edges.start : edges.end) return;
    const el = listRef.current;
    const smooth = animate && !prefersReducedMotion();
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const max = el.scrollWidth - el.clientWidth;
    // A pending target counts for 1 s at most, so an interrupted scroll (a swipe) never leaves it stale.
    const pending = smooth && targetRef.current && Date.now() - targetRef.current.at < 1000 ? targetRef.current.left : null;
    // (Moving from the half-way position would let scroll-snap pull the row back to the same card.)
    const from = pending ?? el.scrollLeft;
    // One page = the cards that fit in view: whole card widths plus gaps (the row's padding excluded).
    const card = el.firstElementChild?.getBoundingClientRect().width || el.clientWidth;
    const perPage = Math.max(1, Math.round((el.clientWidth + gap) / (card + gap)));
    const left = Math.max(0, Math.min(max, from + direction * perPage * (card + gap)));
    targetRef.current = smooth ? { left, at: Date.now() } : null;
    el.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' });
  };

  const buttonClass = 'flex h-10 w-10 items-center justify-center rounded-full bg-[var(--card)] text-lg text-[var(--text)] shadow-sm ring-1 ring-[var(--border)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] aria-disabled:cursor-default aria-disabled:opacity-40';
  return (
    <section aria-roledescription="carousel" aria-label="Testimonials">
      {/* Focusable so the arrow keys scroll it; scroll-snap keeps whole cards in view. */}
      <ul ref={listRef} onScroll={updateEdges} tabIndex={0} aria-label="Testimonials, scroll sideways"
        // p-1 + scroll-px-1: room for the cards' 1 px ring, which the scroll container would otherwise clip.
        className={`flex snap-x snap-mandatory scroll-px-1 gap-4 overflow-x-auto p-1 pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${animate ? 'motion-safe:scroll-smooth' : 'scroll-auto'}`}>
        {testimonials.map((t, i) => (
          <Item key={i} animate={animate} index={i}
            className="w-full flex-none snap-start sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]">
            <WallCard testimonial={t} />
          </Item>
        ))}
      </ul>
      {/* No buttons when every card already fits. */}
      {!(edges.start && edges.end) && (
        <div className="mt-3 flex justify-center gap-3">
          <button type="button" onClick={() => move(-1)} aria-disabled={edges.start || undefined} aria-label="Previous testimonials" className={buttonClass}>‹</button>
          <button type="button" onClick={() => move(1)} aria-disabled={edges.end || undefined} aria-label="Next testimonials" className={buttonClass}>›</button>
        </div>
      )}
    </section>
  );
}

function Testimonials({ layout, testimonials, animate }) {
  if (layout === 'carousel') return <Carousel testimonials={testimonials} animate={animate} />;
  const listClass = layout === 'list' ? 'mx-auto max-w-3xl space-y-4' : 'gap-4 sm:columns-2 lg:columns-3';
  return (
    <ul className={listClass} aria-label="Testimonials">
      {testimonials.map((t, i) => (
        // The wall exposes no ids (E48); the list is static, so the index is a stable key.
        <Item key={i} animate={animate} index={i} className={layout === 'list' ? '' : 'mb-4 break-inside-avoid'}>
          <WallCard testimonial={t} />
        </Item>
      ))}
    </ul>
  );
}

export default function EmbedPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [load, setLoad] = useState({ status: 'loading', data: null });
  const rootRef = useRef(null);
  useReportHeight(rootRef);

  useEffect(() => {
    const controller = new AbortController();
    setLoad({ status: 'loading', data: null });
    api(`/public/spaces/${encodeURIComponent(slug)}/wall`, { signal: controller.signal })
      .then((data) => setLoad({ status: 'ready', data }))
      .catch((error) => {
        if (error.name !== 'AbortError') setLoad({ status: error.status === 404 ? 'missing' : 'error', data: null });
      });
    return () => controller.abort();
  }, [slug]);

  const space = load.data?.space;
  const settings = parseEmbedSettings(searchParams, space?.themeCode);
  const vars = themeVars(settings.mode, space?.brandColor);
  const background = settings.bg ?? vars['--page'];
  // Text outside the cards sits on `bg`, so it is chosen for contrast with it. With a transparent
  // background the host's colour is unknown; the mode's colours are used (the builder says to match).
  const transparent = background === 'transparent';
  const footerColor = transparent ? vars['--muted'] : textOn(background);
  const titleColor = transparent ? vars['--text'] : textOn(background);

  // The frame's own page background, so the colour fills the whole iframe (or lets the host show through).
  useEffect(() => {
    const { documentElement: html, body } = document;
    const previous = [html.style.background, body.style.background];
    html.style.background = background;
    body.style.background = background;
    return () => { [html.style.background, body.style.background] = previous; };
  }, [background]);

  let content;
  if (load.status === 'loading') content = <p role="status" className="py-8 text-center text-sm" style={{ color: footerColor }}>Loading…</p>;
  else if (load.status === 'missing') content = <p className="py-8 text-center text-sm" style={{ color: footerColor }}>This wall isn&apos;t available.</p>;
  else if (load.status === 'error') content = <p role="alert" className="py-8 text-center text-sm" style={{ color: footerColor }}>Testimonials could not be loaded.</p>;
  else if (load.data.testimonials.length === 0) content = <p className="py-8 text-center text-sm" style={{ color: footerColor }}>No testimonials yet.</p>;
  else content = <Testimonials layout={settings.layout} testimonials={load.data.testimonials} animate={settings.animate} />;

  return (
    <main ref={rootRef} style={{ ...vars, background }} className="p-4 text-[var(--text)]">
      {space && settings.header ? (
        // E73 (FR-04): the saved logo (or the initial in the brand colour) and the space name.
        <header className="mb-4 flex items-center gap-3">
          {space.logoUrl
            ? <img src={space.logoUrl} alt="" className="h-10 w-10 flex-none rounded-xl bg-[var(--card)] object-contain p-0.5 ring-1 ring-[var(--border)]" />
            : <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[var(--brand)] text-lg font-bold text-[var(--on-brand)]">{[...space.title][0]?.toUpperCase()}</span>}
          <h1 className="min-w-0 truncate text-lg font-semibold" style={{ color: titleColor }}>
            <span className="sr-only">Testimonials for </span>{space.title}
          </h1>
        </header>
      ) : (
        <h1 className="sr-only">{space ? `Testimonials for ${space.title}` : 'Testimonials'}</h1>
      )}
      {content}
      {space && (
        <p className="mt-4 text-center text-xs" style={{ color: footerColor }}>
          <a href={`/s/${space.slug}`} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
            Share your experience
          </a>
          {' · '}
          Collected with{' '}
          <a href="/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Testimonial MVP</a>
        </p>
      )}
    </main>
  );
}
