// /login and /signup (FR-01, redesigned per plan.md E20). After success the GuestOnly guard sends
// the owner to ?next or the dashboard. Behaviour follows PRD §10; only the layout changed.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import { Alert, Button, PasswordInput, Spinner, TextInput } from '../components/ui.jsx';

function Stars() {
  return (
    <div className="flex gap-0.5 text-amber-300" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5Z" />
        </svg>
      ))}
    </div>
  );
}

/** Left panel: brand message and one synthetic sample testimonial (hidden on narrow screens). */
function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-10 text-white lg:flex lg:flex-col">
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-violet-400/30 blur-3xl" />
      <div className="relative">
        <Logo light />
      </div>
      <div className="relative mt-auto">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">
          Turn happy customers into your best marketing.
        </h2>
        <ul className="mt-6 space-y-3 text-indigo-50">
          {['Collect testimonials with one link — no customer accounts', 'Approve, favourite, and publish from one inbox', 'Show a Wall of Love on any website'].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 flex-none text-indigo-200" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
              </svg>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <figure className="mt-10 rounded-2xl bg-white/10 p-6 ring-1 ring-white/20 backdrop-blur">
          <Stars />
          <blockquote className="mt-3 text-base leading-relaxed text-white">
            “We set up a space in five minutes and had our first ten testimonials by the weekend.”
          </blockquote>
          <figcaption className="mt-4 text-sm text-indigo-100">
            <span className="font-semibold text-white">Nadia Rahman</span> · Owner, Sunrise Bakery (sample)
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="min-h-screen bg-slate-50 bg-grid px-4 py-10 sm:py-16">
      <div className="mx-auto mb-8 flex max-w-[960px] justify-center lg:hidden">
        <Logo />
      </div>
      <div className="mx-auto grid w-full max-w-[960px] overflow-hidden rounded-3xl bg-white shadow-xl shadow-indigo-900/5 ring-1 ring-slate-200 lg:min-h-[640px] lg:grid-cols-2">
        <BrandPanel />
        <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-base text-slate-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-base text-slate-600">{footer}</p>
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/" className="underline-offset-4 hover:text-slate-700 hover:underline">← Back to home</Link>
      </p>
    </main>
  );
}

/** Keeps ?next when switching between the two pages. */
function useNextQuery() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  return next ? `?next=${encodeURIComponent(next)}` : '';
}

function useAuthForm(submit) {
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    setFields({});
    try {
      await submit(new FormData(event.currentTarget));
    } catch (err) {
      setError(err.status === 400 ? 'Please fix the highlighted fields.' : err.message);
      setFields(err.fields ?? {});
      setPending(false);
    }
  }
  return { error, fields, pending, onSubmit };
}

function SubmitButton({ pending, idle, busy }) {
  return (
    <Button type="submit" size="lg" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-600/20 hover:from-indigo-700 hover:to-violet-700 disabled:from-indigo-300 disabled:to-violet-300" disabled={pending}>
      {pending ? <><Spinner /> {busy}</> : idle}
    </Button>
  );
}

const switchLink = 'font-semibold text-indigo-700 underline-offset-4 hover:underline';

export function LoginPage() {
  const { login } = useAuth();
  const query = useNextQuery();
  const { error, fields, pending, onSubmit } = useAuthForm((data) => login(data.get('email'), data.get('password')));

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to manage your spaces and testimonials."
      footer={<>New here? <Link className={switchLink} to={`/signup${query}`}>Create an account</Link></>}
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <Alert>{error}</Alert>
        <TextInput label="Email" name="email" type="email" inputSize="lg" placeholder="you@company.com" autoComplete="email" required error={fields.email} />
        <PasswordInput name="password" placeholder="Your password" autoComplete="current-password" required error={fields.password} />
        <SubmitButton pending={pending} idle="Log in" busy="Logging in…" />
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const { register } = useAuth();
  const query = useNextQuery();
  const { error, fields, pending, onSubmit } = useAuthForm((data) => register(data.get('name'), data.get('email'), data.get('password')));

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start collecting testimonials in minutes — free."
      footer={<>Already have an account? <Link className={switchLink} to={`/login${query}`}>Log in</Link></>}
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <Alert>{error}</Alert>
        <TextInput label="Name" name="name" inputSize="lg" placeholder="Your name" autoComplete="name" maxLength={100} required error={fields.name} />
        <TextInput label="Email" name="email" type="email" inputSize="lg" placeholder="you@company.com" autoComplete="email" maxLength={254} required error={fields.email} />
        <PasswordInput name="password" placeholder="Create a password" hint="At least 8 characters" autoComplete="new-password" minLength={8} maxLength={128} required error={fields.password} />
        <SubmitButton pending={pending} idle="Create account" busy="Creating account…" />
        <p className="text-center text-sm text-slate-500">New accounts start on the Free plan. No card needed.</p>
      </form>
    </AuthShell>
  );
}
