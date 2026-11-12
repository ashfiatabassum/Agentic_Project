// /login and /signup (FR-01). After success the GuestOnly guard sends the owner to ?next or the dashboard.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { Alert, Button, TextInput } from '../components/ui.jsx';

function AuthCard({ title, children, footer }) {
  return (
    <main className="flex min-h-screen items-start justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold text-indigo-600">Testimonial MVP</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
      </div>
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

export function LoginPage() {
  const { login } = useAuth();
  const query = useNextQuery();
  const { error, fields, pending, onSubmit } = useAuthForm((data) => login(data.get('email'), data.get('password')));

  return (
    <AuthCard title="Log in" footer={<>New here? <Link className="font-medium text-indigo-700 underline" to={`/signup${query}`}>Create an account</Link></>}>
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Alert>{error}</Alert>
        <TextInput label="Email" name="email" type="email" autoComplete="email" required error={fields.email} />
        <TextInput label="Password" name="password" type="password" autoComplete="current-password" required error={fields.password} />
        <Button type="submit" className="w-full" disabled={pending}>{pending ? 'Logging in…' : 'Log in'}</Button>
      </form>
    </AuthCard>
  );
}

export function SignupPage() {
  const { register } = useAuth();
  const query = useNextQuery();
  const { error, fields, pending, onSubmit } = useAuthForm((data) => register(data.get('name'), data.get('email'), data.get('password')));

  return (
    <AuthCard title="Create your account" footer={<>Already have an account? <Link className="font-medium text-indigo-700 underline" to={`/login${query}`}>Log in</Link></>}>
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Alert>{error}</Alert>
        <TextInput label="Name" name="name" autoComplete="name" maxLength={100} required error={fields.name} />
        <TextInput label="Email" name="email" type="email" autoComplete="email" maxLength={254} required error={fields.email} />
        <TextInput label="Password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters" minLength={8} maxLength={128} required error={fields.password} />
        <Button type="submit" className="w-full" disabled={pending}>{pending ? 'Creating account…' : 'Sign up'}</Button>
        <p className="text-xs text-slate-500">New accounts start on the Free plan.</p>
      </form>
    </AuthCard>
  );
}
