// Public collection page /s/:slug (FR-05, FR-06; plan.md E26–E27). No login: customers never
// have accounts. Styled with the space's theme, brand colour, and logo. The server validates
// everything; the browser only gives early feedback.
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../lib/api.js';
import { themeVars } from '../public/publicTheme.js';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const inputClass =
  'block w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3.5 py-2.5 text-base text-[var(--text)] placeholder:text-[var(--muted)] placeholder:opacity-70 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 aria-[invalid=true]:border-[var(--danger)]';

// ---------------------------------------------------------------- themed field pieces

function ThemedField({ label, required, optional, error, hint, children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-[var(--text)]">
        {label}
        {required && <span aria-hidden="true" className="text-[var(--danger)]"> *</span>}
        {optional && <span className="font-normal text-[var(--muted)]"> (optional)</span>}
      </label>
      {hint && <p id={hintId} className="mt-0.5 text-sm text-[var(--muted)]">{hint}</p>}
      <div className="mt-1.5">
        {children({ id, 'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined, 'aria-invalid': error ? true : undefined })}
      </div>
      {error && <p id={errorId} className="mt-1 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}

function Input({ label, required, optional, error, hint, multiline = false, ...props }) {
  return (
    <ThemedField label={label} required={required} optional={optional} error={error} hint={hint}>
      {(a11y) => (multiline
        ? <textarea rows={5} className={inputClass} required={required} {...a11y} {...props} />
        : <input className={inputClass} required={required} {...a11y} {...props} />)}
    </ThemedField>
  );
}

const STAR_PATH = 'M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5Z';

/** Star rating as a radio group: arrow keys work natively; each star has a spoken label. */
function RatingInput({ value, onChange, required, error }) {
  const name = useId();
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="text-sm font-semibold text-[var(--text)]">
        Your rating{required ? <span aria-hidden="true" className="text-[var(--danger)]"> *</span> : <span className="font-normal text-[var(--muted)]"> (optional)</span>}
      </legend>
      <div className="mt-1.5 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded-md p-0.5 has-focus-visible:ring-2 has-focus-visible:ring-[var(--brand)]" onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`} />
            <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-9 w-9 transition-colors ${n <= shown ? 'text-amber-400' : 'text-[var(--star-empty)]'}`} fill="currentColor">
              <path d={STAR_PATH} />
            </svg>
          </label>
        ))}
      </div>
      {!required && value ? (
        // Radio buttons cannot be unchecked, so an optional rating gets an explicit clear button.
        <button type="button" onClick={() => onChange(null)} className="mt-1 text-sm text-[var(--muted)] underline underline-offset-2 hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">
          Clear rating
        </button>
      ) : null}
      {error && <p id={`${name}-error`} className="mt-1 text-sm text-[var(--danger)]">{error}</p>}
    </fieldset>
  );
}

const CUSTOMER_FIELD_KEYS = ['jobTitle', 'company', 'socialLink', 'photo', 'rating'];
const FORM_CHANGED = 'This form changed while you were filling it in. Reload the page and try again.';

/**
 * Message for the summary alert after a 400. Errors the page cannot show next to a field —
 * `form`, or a field the owner switched on after this page loaded — are surfaced here.
 */
function summaryFor(fieldErrors, fields) {
  if (fieldErrors.form) return fieldErrors.form;
  const shown = (key) => ['name', 'email', 'body', 'answers'].includes(key) || key.startsWith('answers.')
    || (CUSTOMER_FIELD_KEYS.includes(key) && fields[key] !== 'off');
  return Object.keys(fieldErrors).some((key) => !shown(key)) ? FORM_CHANGED : 'Please check the highlighted fields.';
}

function PhotoInput({ file, onChange, required, error, onClientError }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(event) {
    const chosen = event.target.files?.[0];
    event.target.value = ''; // allow choosing the same file again after removing it
    if (!chosen) return;
    if (!PHOTO_TYPES.includes(chosen.type)) return onClientError('Choose a JPEG, PNG, or WebP image');
    if (chosen.size > MAX_PHOTO_BYTES) return onClientError('The photo must be 2 MB or smaller');
    onClientError('');
    onChange(chosen);
  }

  return (
    <ThemedField label="Your photo" required={required} optional={!required} error={error} hint="JPEG, PNG, or WebP, up to 2 MB">
      {(a11y) => (
        <div className="flex items-center gap-4">
          {preview
            ? <img src={preview} alt="Your photo preview" className="h-16 w-16 rounded-full object-cover ring-2 ring-[var(--border)]" />
            : <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[var(--border)] text-xs text-[var(--muted)]">Photo</span>}
          {/* The visible button is the only keyboard stop; the native input stays for the label link. */}
          <input ref={inputRef} type="file" accept={PHOTO_TYPES.join(',')} onChange={choose} className="sr-only" tabIndex={-1} {...a11y} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} aria-describedby={a11y['aria-describedby']} aria-label={file ? 'Change your photo' : 'Choose your photo'} className="rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--page)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">
              {file ? 'Change photo' : 'Choose photo'}
            </button>
            {file && (
              <button type="button" onClick={() => onChange(null)} aria-label="Remove your photo" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </ThemedField>
  );
}

function Checkbox({ checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[15px] text-[var(--text)]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none rounded border-[var(--border)] accent-[var(--brand)]" />
      <span>{children}</span>
    </label>
  );
}

// ---------------------------------------------------------------- page

const emptyForm = () => ({
  rating: null, body: '', answers: {}, name: '', email: '', jobTitle: '', company: '', socialLink: '',
  photo: null, consentPublic: false, consentSocial: false,
});

function Shell({ vars, children }) {
  return (
    <main style={vars} className="min-h-screen bg-[var(--page)] px-4 py-10 text-[var(--text)] sm:py-16">
      <div className="mx-auto w-full max-w-2xl">{children}</div>
      <p className="mt-10 text-center text-xs text-[var(--muted)]">
        Collected with <Link to="/" className="underline underline-offset-2 hover:text-[var(--text)]">Testimonial MVP</Link>
      </p>
    </main>
  );
}

export default function PublicSpacePage() {
  const { slug } = useParams();
  const [load, setLoad] = useState({ status: 'loading', space: null, error: '' });
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const [thankYou, setThankYou] = useState('');
  const thankYouRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoad({ status: 'loading', space: null, error: '' });
    api(`/public/spaces/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((data) => setLoad({ status: 'ready', space: data.space, error: '' }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setLoad({ status: error.status === 404 ? 'missing' : 'error', space: null, error: error.message });
      });
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (thankYou) thankYouRef.current?.focus();
  }, [thankYou]);

  const space = load.space;
  const vars = themeVars(space?.themeCode, space?.brandColor);

  if (load.status === 'loading') {
    return <Shell vars={vars}><p role="status" className="text-center text-[var(--muted)]">Loading…</p></Shell>;
  }
  if (load.status === 'missing') {
    return (
      <Shell vars={vars}>
        <div className="rounded-2xl bg-[var(--card)] p-10 text-center shadow-sm ring-1 ring-[var(--border)]">
          <h1 className="text-2xl font-semibold">This page doesn&apos;t exist</h1>
          <p className="mt-2 text-[var(--muted)]">Check the link you were given — it may have changed.</p>
        </div>
      </Shell>
    );
  }
  if (load.status === 'error') {
    return (
      <Shell vars={vars}>
        <div role="alert" className="rounded-2xl bg-[var(--card)] p-10 text-center shadow-sm ring-1 ring-[var(--border)]">
          <h1 className="text-xl font-semibold">We could not load this page</h1>
          <p className="mt-2 text-[var(--muted)]">{load.error}</p>
        </div>
      </Shell>
    );
  }

  const { fields } = space;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const on = (mode) => mode !== 'off';

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setFormError('');
    setErrors({});
    const data = {
      name: form.name,
      email: form.email,
      body: form.body,
      consentPublic: form.consentPublic,
      consentSocial: form.consentSocial,
      answers: space.questions.map((q) => ({ questionId: q.id, text: form.answers[q.id] ?? '' })).filter((a) => a.text.trim()),
    };
    if (on(fields.jobTitle)) data.jobTitle = form.jobTitle;
    if (on(fields.company)) data.company = form.company;
    if (on(fields.socialLink)) data.socialLink = form.socialLink;
    if (on(fields.rating) && form.rating) data.rating = form.rating;

    const body = new FormData();
    body.append('data', JSON.stringify(data));
    if (on(fields.photo) && form.photo) body.append('photo', form.photo);

    try {
      const result = await api(`/public/spaces/${encodeURIComponent(slug)}/testimonials`, { method: 'POST', form: body });
      setThankYou(result.thankYouMessage);
      setForm(emptyForm());
    } catch (error) {
      const fieldErrors = error.fields ?? {};
      setErrors(fieldErrors);
      setFormError(error.status === 400 ? summaryFor(fieldErrors, fields) : error.message);
      setPending(false);
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    setPending(false);
  }

  const header = (
    <header className="text-center">
      {space.logoUrl
        ? <img src={space.logoUrl} alt={`${space.title} logo`} className="mx-auto h-20 w-20 rounded-2xl bg-[var(--card)] object-contain p-1 shadow-sm ring-1 ring-[var(--border)]" />
        : <span aria-hidden="true" className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--brand)] text-3xl font-bold text-[var(--on-brand)]">{[...space.title][0]?.toUpperCase()}</span>}
      <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{space.title}</h1>
      {space.subtitle && <p className="mt-2 whitespace-pre-line text-lg text-[var(--muted)]">{space.subtitle}</p>}
    </header>
  );

  if (thankYou) {
    return (
      <Shell vars={vars}>
        {header}
        <section className="mt-8 rounded-2xl bg-[var(--card)] p-8 text-center shadow-sm ring-1 ring-[var(--border)] sm:p-12">
          <span aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-2xl text-[var(--on-brand)]">✓</span>
          {/* Neutral heading so the default message ("Thank you! …") is not repeated twice. */}
          <h2 ref={thankYouRef} tabIndex={-1} className="mt-5 text-2xl font-semibold focus:outline-none">Testimonial sent</h2>
          <p className="mt-3 whitespace-pre-line text-lg text-[var(--muted)]">{thankYou}</p>
          <button type="button" onClick={() => { setThankYou(''); setErrors({}); }} className="mt-8 rounded-lg px-4 py-2 text-sm font-semibold text-[var(--text)] underline underline-offset-4 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">
            Send another testimonial
          </button>
        </section>
      </Shell>
    );
  }

  return (
    <Shell vars={vars}>
      {header}
      <form onSubmit={submit} noValidate className="mt-8 space-y-6 rounded-2xl bg-[var(--card)] p-6 shadow-sm ring-1 ring-[var(--border)] sm:p-10">
        <p className="whitespace-pre-line text-xl font-semibold">{space.prompt}</p>

        {formError && (
          <div role="alert" className="rounded-lg border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{formError}</div>
        )}

        {on(fields.rating) && (
          <RatingInput value={form.rating} onChange={(rating) => set({ rating })} required={fields.rating === 'required'} error={errors.rating} />
        )}

        <Input label="Your testimonial" required multiline maxLength={2000} placeholder="What did you like? How did it help you?" value={form.body} onChange={(e) => set({ body: e.target.value })} error={errors.body} />

        {space.questions.map((q) => (
          <Input key={q.id} label={q.text} optional multiline rows={3} maxLength={1000} value={form.answers[q.id] ?? ''}
            onChange={(e) => {
              const text = e.target.value;
              // Functional update (vercel-react-best-practices: rerender-functional-setstate).
              setForm((f) => ({ ...f, answers: { ...f.answers, [q.id]: text } }));
            }} error={errors[`answers.${q.id}`]} />
        ))}
        {errors.answers && <p role="alert" className="text-sm text-[var(--danger)]">{errors.answers}</p>}

        <div className="grid gap-6 sm:grid-cols-2">
          <Input label="Your name" required maxLength={100} autoComplete="name" value={form.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} />
          <Input label="Your email" required type="email" maxLength={254} autoComplete="email" hint="Never shown publicly" value={form.email} onChange={(e) => set({ email: e.target.value })} error={errors.email} />
          {on(fields.jobTitle) && (
            <Input label="Job title" required={fields.jobTitle === 'required'} optional={fields.jobTitle === 'optional'} maxLength={100} autoComplete="organization-title" value={form.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} error={errors.jobTitle} />
          )}
          {on(fields.company) && (
            <Input label="Company" required={fields.company === 'required'} optional={fields.company === 'optional'} maxLength={100} autoComplete="organization" value={form.company} onChange={(e) => set({ company: e.target.value })} error={errors.company} />
          )}
        </div>

        {on(fields.socialLink) && (
          <Input label="Social or website link" type="url" required={fields.socialLink === 'required'} optional={fields.socialLink === 'optional'} maxLength={300} placeholder="https://linkedin.com/in/your-name" value={form.socialLink} onChange={(e) => set({ socialLink: e.target.value })} error={errors.socialLink} />
        )}

        {on(fields.photo) && (
          <PhotoInput file={form.photo} onChange={(photo) => set({ photo })} required={fields.photo === 'required'} error={errors.photo}
            onClientError={(message) => setErrors((e) => ({ ...e, photo: message || undefined }))} />
        )}

        <fieldset className="space-y-3 rounded-xl border border-[var(--border)] p-4">
          <legend className="px-1 text-sm font-semibold">Permissions</legend>
          <Checkbox checked={form.consentPublic} onChange={(consentPublic) => set({ consentPublic })}>
            You may show my testimonial publicly (for example on this business&apos;s website).
          </Checkbox>
          <Checkbox checked={form.consentSocial} onChange={(consentSocial) => set({ consentSocial })}>
            You may share my testimonial on social media.
          </Checkbox>
        </fieldset>

        <button type="submit" disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--brand)] text-base font-semibold text-[var(--on-brand)] shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? 'Sending…' : 'Send testimonial'}
        </button>
        <p className="text-center text-xs text-[var(--muted)]">Your email is only shared with the owner of this page.</p>
      </form>
    </Shell>
  );
}
