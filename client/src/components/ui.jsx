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
      {hint && <p id={hintId} className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-1">{children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}</div>
      {error && <p id={errorId} className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 aria-[invalid=true]:border-red-500';

export function TextInput({ label, error, hint, required, multiline = false, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a11y) => (multiline
        ? <textarea rows={3} className={inputClass} required={required} {...a11y} {...props} />
        : <input className={inputClass} required={required} {...a11y} {...props} />)}
    </Field>
  );
}

const buttonStyles = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary: 'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:text-slate-300',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed ${buttonStyles[variant]} ${className}`}
      {...props}
    />
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
