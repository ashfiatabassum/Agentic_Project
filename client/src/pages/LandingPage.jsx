// Public landing page at "/" (plan.md E19). Light + indigo theme. All names, quotes, and numbers
// in the previews are synthetic samples. Layout inspired by testimonial apps; wording is our own.
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import { usePlans } from '../lib/plans.js';

// ---------------------------------------------------------------------------------------------
// Small building blocks

function Stars({ count = 5, className = 'h-4 w-4' }) {
  return (
    <div className="flex gap-0.5 text-amber-400" role="img" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={`${className} ${i < count ? '' : 'text-slate-200'}`} fill="currentColor" aria-hidden="true">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5Z" />
        </svg>
      ))}
    </div>
  );
}

const AVATAR_COLOURS = ['bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500'];

function Avatar({ name, index = 0, size = 'h-10 w-10 text-sm' }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  return (
    <span aria-hidden="true" className={`inline-flex flex-none items-center justify-center rounded-full font-semibold text-white ${AVATAR_COLOURS[index % AVATAR_COLOURS.length]} ${size}`}>
      {initials}
    </span>
  );
}

const SAMPLE_TESTIMONIALS = [
  { name: 'Nadia Rahman', role: 'Owner, Sunrise Bakery', stars: 5, quote: 'We set up a space in five minutes and had our first ten testimonials by the weekend.' },
  { name: 'Tanvir Hasan', role: 'Founder, Bright Events', stars: 5, quote: 'Our Wall of Love answers the "can we trust you?" question before clients even ask it.' },
  { name: 'Emily Carter', role: 'Marketing lead, Fernwood Studio', stars: 5, quote: 'The inbox makes it easy to pick our favourites and keep the odd spam message out.' },
  { name: 'Arif Chowdhury', role: 'Coach, Strong Start Fitness', stars: 4, quote: 'Clients love that they can leave a review without creating yet another account.' },
  { name: 'Sofia Lopez', role: 'Designer, Pixel & Thread', stars: 5, quote: 'I embedded the wall on my portfolio in one paste. It matches my site perfectly.' },
  { name: 'Rafiq Ahmed', role: 'Manager, Green Leaf Café', stars: 5, quote: 'Asking for feedback used to feel awkward. Now we just share one friendly link.' },
];

// Hoisted static SVG paths (vercel-react-best-practices: rendering-hoist-jsx).
const ICON_PATHS = {
  collect: <path d="M4 5h16v11H8l-4 4V5Z M8 9h8 M8 12h5" />,
  manage: <path d="M4 6h16 M4 12h16 M4 18h10 M18 16l2 2 3-3" />,
  showcase: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  embed: <path d="M8 8l-4 4 4 4 M16 8l4 4-4 4 M13.5 5l-3 14" />,
  arrow: <path d="M5 12h14 M13 6l6 6-6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------
// Navigation

function NavBar() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-8 text-[15px] font-medium text-slate-600 md:flex">
          <li><a href="#features" className="hover:text-slate-900">Features</a></li>
          <li><a href="#wall-of-love" className="hover:text-slate-900">Wall of Love</a></li>
          <li><a href="#pricing" className="hover:text-slate-900">Pricing</a></li>
        </ul>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/dashboard" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                Log in
              </Link>
              <Link to="/signup" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
                Start for free
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

// ---------------------------------------------------------------------------------------------
// Hero + interactive feature tabs

const TABS = [
  { id: 'collect', label: 'Collect', icon: 'collect', url: 'sunrise-bakery' },
  { id: 'manage', label: 'Manage', icon: 'manage', url: 'dashboard/inbox' },
  { id: 'showcase', label: 'Showcase', icon: 'showcase', url: 'sunrise-bakery/wall' },
  { id: 'embed', label: 'Embed', icon: 'embed', url: 'dashboard/embed' },
];

function CollectPreview() {
  return (
    <div className="mx-auto max-w-md">
      <div className="text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-xl font-bold text-orange-600">S</span>
        <h3 className="mt-3 text-lg font-semibold text-slate-900">Sunrise Bakery</h3>
        <p className="mt-1 text-sm text-slate-600">How was your experience with us?</p>
      </div>
      <div className="mt-5 space-y-3">
        <div>
          <p className="text-xs font-medium text-slate-700">Your rating</p>
          <div className="mt-1"><Stars className="h-6 w-6" /></div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">The sourdough is the best in town…</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">Your name</div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">Email</div>
        </div>
        {/* Consent starts unchecked (FR-06); the customer ticks it themselves. */}
        <p className="flex items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex h-4 w-4 rounded border border-slate-300 bg-white" />
          You may show my testimonial publicly
        </p>
        <div className="rounded-lg bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white">Send testimonial</div>
      </div>
    </div>
  );
}

function ManagePreview() {
  const rows = [
    { ...SAMPLE_TESTIMONIALS[0], tag: 'On wall', tagClass: 'bg-emerald-50 text-emerald-700', fav: true },
    { ...SAMPLE_TESTIMONIALS[2], tag: 'New', tagClass: 'bg-indigo-50 text-indigo-700' },
    { ...SAMPLE_TESTIMONIALS[3], tag: 'Hidden', tagClass: 'bg-slate-100 text-slate-600' },
  ];
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Inbox</h3>
        <div className="flex gap-1.5 text-xs font-medium">
          {['All', 'Favourites', 'On wall', 'Hidden'].map((f, i) => (
            <span key={f} className={`rounded-full px-2.5 py-1 ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{f}</span>
          ))}
        </div>
      </div>
      <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {rows.map((r, i) => (
          <li key={r.name} className="flex items-start gap-3 p-3">
            <Avatar name={r.name} index={i} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                {r.fav && <span className="text-amber-400" aria-label="Favourite">★</span>}
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.tagClass}`}>{r.tag}</span>
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-600">“{r.quote}”</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShowcasePreview() {
  return (
    <div>
      <h3 className="text-center text-lg font-semibold text-slate-900">Wall of Love</h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {SAMPLE_TESTIMONIALS.slice(0, 4).map((t, i) => (
          <figure key={t.name} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <Stars count={t.stars} className="h-3.5 w-3.5" />
            <blockquote className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-700">“{t.quote}”</blockquote>
            <figcaption className="mt-2 flex items-center gap-2">
              <Avatar name={t.name} index={i} size="h-6 w-6 text-[10px]" />
              <span className="text-xs font-semibold text-slate-900">{t.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function EmbedPreview() {
  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-900">Embed on your site</h3>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium">
        {['Grid', 'Carousel', 'Light', 'Dark', 'Animated'].map((o, i) => (
          <span key={o} className={`rounded-full px-2.5 py-1 ${[0, 2, 4].includes(i) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{o}</span>
        ))}
      </div>
      <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-[12px] leading-relaxed text-slate-100"><code>{`<iframe
  src="https://your-app/embed/sunrise-bakery
       ?layout=grid&mode=light&animate=1"
  width="100%" height="520"
  style="border:0" loading="lazy"></iframe>`}</code></pre>
      <p className="mt-3 text-sm text-slate-600">Copy, paste, done — the wall updates when you approve new testimonials.</p>
    </div>
  );
}

const PREVIEWS = { collect: CollectPreview, manage: ManagePreview, showcase: ShowcasePreview, embed: EmbedPreview };

function FeatureTabs({ active, onChange }) {
  const refs = useRef([]);

  // Arrow keys move between tabs and select them (WAI-ARIA tabs pattern, automatic activation).
  function onKeyDown(event, index) {
    const last = TABS.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(TABS[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label="Product features" className="flex flex-wrap justify-center gap-3">
      {TABS.map((tab, i) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => { refs.current[i] = el; }}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls="feature-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 ${
              selected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-indigo-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300'
            }`}
          >
            <Icon name={tab.icon} className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function FloatingCard({ t, index, className }) {
  return (
    <figure className={`absolute hidden w-64 rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 transition-transform duration-300 motion-safe:hover:-translate-y-1 xl:block ${className}`}>
      <figcaption className="flex items-center gap-3">
        <Avatar name={t.name} index={index} />
        <div>
          <p className="text-sm font-semibold text-slate-900">{t.name}</p>
          <p className="text-xs text-slate-500">{t.role}</p>
        </div>
      </figcaption>
      <div className="mt-3"><Stars count={t.stars} /></div>
      <blockquote className="mt-2 text-sm leading-relaxed text-slate-700">“{t.quote}”</blockquote>
    </figure>
  );
}

function Hero() {
  const [active, setActive] = useState('collect');
  const tab = TABS.find((t) => t.id === active);
  const Preview = PREVIEWS[active];

  return (
    <section className="relative overflow-hidden bg-grid">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-indigo-50/80 via-white/40 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-100">
          <span className="h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" /> Text testimonials, made simple
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
          Collect, curate &amp; <span className="text-gradient">showcase what customers love</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
          Share one link, gather genuine testimonials without customer sign-ups, and turn the best ones into a Wall of Love for your website.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/signup" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5">
            Start for free <Icon name="arrow" className="h-5 w-5" />
          </Link>
          <a href="#features" className="inline-flex items-center rounded-xl bg-white px-7 py-4 text-base font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
            See how it works
          </a>
        </div>
        <p className="mt-4 text-sm text-slate-500">Free plan: 3 spaces · no card needed</p>

        <div className="mt-16">
          <FeatureTabs active={active} onChange={setActive} />
        </div>

        <div className="relative mx-auto mt-10 max-w-3xl">
          <FloatingCard t={SAMPLE_TESTIMONIALS[1]} index={1} className="-left-72 top-10 -rotate-3 motion-safe:animate-float" />
          <FloatingCard t={SAMPLE_TESTIMONIALS[4]} index={4} className="-right-72 top-32 rotate-2 motion-safe:animate-float-slow" />

          {/* Mock app window */}
          <div className="overflow-hidden rounded-2xl bg-white text-left shadow-2xl shadow-indigo-900/10 ring-1 ring-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="h-3 w-3 rounded-full bg-red-400" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-emerald-400" />
              </span>
              <span className="flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">testimonial-mvp.app/{tab.url}</span>
            </div>
            <div id="feature-panel" role="tabpanel" aria-labelledby={`tab-${active}`} tabIndex={0} className="min-h-[420px] bg-slate-50/60 p-8 focus:outline-none">
              <div key={active} className="motion-safe:animate-fade-in">
                <Preview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Sections

const FEATURES = [
  { icon: 'collect', title: 'One link to collect', text: 'Create a branded space with your own questions. Customers answer without making an account.' },
  { icon: 'manage', title: 'One inbox to curate', text: 'Search, favourite, hide, and edit. Nothing goes public without the customer’s consent.' },
  { icon: 'showcase', title: 'A Wall of Love', text: 'Publish your best testimonials to a public page that looks great on any screen.' },
  { icon: 'embed', title: 'Embed anywhere', text: 'Pick a layout and theme, copy one snippet, and paste it into any website builder.' },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-24 bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">How it works</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">From happy customer to proof on your site</h2>
          <p className="mt-4 text-lg text-slate-600">Four simple steps — set up in minutes, no code required.</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-900/5 motion-safe:hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <Icon name={f.icon} />
                </span>
                <span className="text-sm font-semibold text-slate-300">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WallOfLove() {
  return (
    <section id="wall-of-love" className="scroll-mt-24 bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Wall of Love</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">This is what your wall could look like</h2>
          <p className="mt-4 text-lg text-slate-600">Sample testimonials shown for illustration.</p>
        </div>
        <div className="mt-14 columns-1 gap-6 sm:columns-2 lg:columns-3">
          {SAMPLE_TESTIMONIALS.map((t, i) => (
            <figure key={t.name} className="mb-6 break-inside-avoid rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition duration-300 hover:shadow-lg hover:shadow-indigo-900/5 motion-safe:hover:-translate-y-1">
              <Stars count={t.stars} />
              <blockquote className="mt-3 text-[15px] leading-relaxed text-slate-700">“{t.quote}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <Avatar name={t.name} index={i} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const { status, plans } = usePlans();
  return (
    <section id="pricing" className="scroll-mt-24 bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Pricing</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Start free, upgrade when you grow</h2>
        </div>
        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {status === 'loading' && <p role="status" className="text-center text-slate-500 md:col-span-2">Loading prices…</p>}
          {status === 'error' && <p role="alert" className="text-center text-slate-600 md:col-span-2">Prices could not be loaded. Please refresh the page.</p>}
          {plans.map((plan) => {
            const featured = plan.code === 'paid';
            return (
              <div key={plan.code} className={`relative flex flex-col rounded-3xl p-8 transition duration-300 motion-safe:hover:-translate-y-1 ${featured ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white ring-1 ring-slate-200 hover:shadow-lg hover:shadow-indigo-900/5'}`}>
                {plan.note && (
                  <span className="absolute right-6 top-6 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/30">{plan.note}</span>
                )}
                <h3 className={`text-lg font-semibold ${featured ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                <p className={`mt-1 text-sm ${featured ? 'text-indigo-100' : 'text-slate-600'}`}>{plan.blurb}</p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className={featured ? 'text-indigo-100' : 'text-slate-500'}>{plan.period}</span>
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[15px]">
                      <Icon name="check" className={`mt-0.5 h-5 w-5 flex-none ${featured ? 'text-indigo-200' : 'text-indigo-600'}`} />
                      <span className={featured ? 'text-white' : 'text-slate-700'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`mt-8 inline-flex h-12 items-center justify-center rounded-xl text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${featured ? 'bg-white text-indigo-700 hover:bg-indigo-50 focus-visible:ring-white focus-visible:ring-offset-indigo-600' : 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-400'}`}
                >
                  {featured ? 'Start free, upgrade later' : 'Start for free'}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          The Paid plan is a demonstration: upgrading is simulated and no payment is taken.
        </p>
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="bg-slate-50 px-6 pb-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-16 text-center text-white shadow-xl shadow-indigo-600/20">
        <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <h2 className="relative text-4xl font-bold tracking-tight">Your customers already love you.</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-lg text-indigo-100">Give them one link to say it — and show it off in minutes.</p>
        <Link to="/signup" className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 text-base font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600 motion-safe:hover:-translate-y-0.5">
          Create your free space <Icon name="arrow" className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500">
        <Logo />
        <p>A student project · Sample testimonials are illustrative · Paid plan is a demo</p>
        <div className="flex gap-5">
          <Link to="/login" className="hover:text-slate-800">Log in</Link>
          <Link to="/signup" className="hover:text-slate-800">Sign up</Link>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <NavBar />
      <main>
        <Hero />
        <Features />
        <WallOfLove />
        <Pricing />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
