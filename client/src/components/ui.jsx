// Small shared form and layout pieces: labelled inputs with inline errors, buttons, alerts.
import { useEffect, useId, useRef, useState } from 'react';

export function Field({ label, error, hint, children, required = false }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
        {required && <span className="text-red-600" aria-hidden="true"> *</span>}
      </label>
      {hint && <p id={hintId} className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      <div className="mt-1">{children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}</div>
      {error && <p id={errorId} className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

const inputBase =
  'block w-full rounded-lg border border-slate-300 bg-white text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-100';
const inputSizes = {
  md: 'px-3 py-2',
  lg: 'h-12 px-4 text-base', // auth pages (E20): 48 px tall, 16 px text
};

/** inputSize: 'md' (default) or 'lg'. */
export function TextInput({ label, error, hint, required, multiline = false, inputSize = 'md', ...props }) {
  const className = `${inputBase} ${inputSizes[inputSize]}`;
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a11y) => (multiline
        ? <textarea rows={3} className={className} required={required} {...a11y} {...props} />
        : <input className={className} required={required} {...a11y} {...props} />)}
    </Field>
  );
}

/** Password field with a show/hide toggle (E20). The toggle never submits the form. */
export function PasswordInput({ label = 'Password', error, hint, required, inputSize = 'lg', ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a11y) => (
        <div className="relative">
          <input
            type={visible ? 'text' : 'password'}
            className={`${inputBase} ${inputSizes[inputSize]} pr-20`}
            required={required}
            {...a11y}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label="Show password"
            className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
      )}
    </Field>
  );
}

const buttonStyles = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary: 'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:text-slate-300',
};

const buttonSizes = {
  md: 'px-4 py-2 text-sm',
  lg: 'h-12 px-6 text-base', // auth pages (E20)
};

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1 rounded-lg font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${buttonSizes[size]} ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

// The wrapper spins, not the <svg> (vercel-react-best-practices: rendering-animate-svg-wrapper).
export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <span aria-hidden="true" className={`inline-block motion-safe:animate-spin ${className}`}>
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Alert({ children, tone = 'error' }) {
  if (!children) return null;
  const styles = tone === 'error' ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm ring-1 ${styles}`}>
      {children}
    </div>
  );
}

export function CopyButton({ text, label = 'Copy link' }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', text); // clipboard blocked: let the person copy by hand
    }
  }

  return (
    <Button variant="secondary" onClick={copy} aria-live="polite">
      {copied ? 'Copied!' : label}
    </Button>
  );
}

export const publicSpaceUrl = (slug) => `${window.location.origin}/s/${slug}`;
