// One testimonial on the Wall of Love (E49). Kept separate so the M5 embed can reuse it.
// Styled only through the theme CSS variables (themeVars). Customer text is rendered as plain
// text by React, never as HTML (no dangerouslySetInnerHTML).
const STAR_PATH = 'M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5Z';

function Stars({ rating }) {
  if (!rating) return null;
  return (
    <span role="img" aria-label={`Rated ${rating} out of 5`} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" aria-hidden="true" fill="currentColor"
          className={`h-5 w-5 ${n <= rating ? 'text-amber-400' : 'text-[var(--star-empty)]'}`}>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

function Avatar({ name, photoUrl }) {
  if (photoUrl) return <img src={photoUrl} alt="" loading="lazy" className="h-11 w-11 flex-none rounded-full object-cover" />;
  const initials = name.split(/\s+/).map((p) => [...p][0] ?? '').slice(0, 2).join('').toUpperCase();
  return (
    <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[var(--brand)] text-sm font-semibold text-[var(--on-brand)]">
      {initials}
    </span>
  );
}

export default function WallCard({ testimonial: t }) {
  const who = [t.jobTitle, t.company].filter(Boolean).join(' · ');
  return (
    <figure className="flex flex-col gap-4 rounded-2xl bg-[var(--card)] p-6 shadow-sm ring-1 ring-[var(--border)]">
      <Stars rating={t.rating} />
      <blockquote className="whitespace-pre-line break-words text-[15px] leading-relaxed">{t.body}</blockquote>
      <figcaption className="flex items-center gap-3">
        <Avatar name={t.name} photoUrl={t.photoUrl} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{t.name}</span>
          {who && <span className="block truncate text-sm text-[var(--muted)]">{who}</span>}
        </span>
      </figcaption>
      {/* PRD §5: edited content is not passed off as the customer's original words. */}
      {t.edited && <p className="text-xs text-[var(--muted)]">Edited by the business</p>}
    </figure>
  );
}
