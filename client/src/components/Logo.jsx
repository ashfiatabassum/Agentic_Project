// Product logo mark + name, shared by the landing page, auth pages, and private header (E19–E20).
import { Link } from 'react-router';

/** inverted: white tile with an indigo mark, for use on the indigo gradient panels. */
export function LogoMark({ className = 'h-9 w-9', inverted = false }) {
  const tile = inverted
    ? 'bg-white text-indigo-600 shadow-sm shadow-indigo-900/20'
    : 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/30';
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center rounded-xl ${tile} ${className}`}>
      {/* A speech bubble with a heart: "customer love". */}
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
        <path d="M12 15.5s-3-1.8-3-3.9a1.6 1.6 0 0 1 3-.9 1.6 1.6 0 0 1 3 .9c0 2.1-3 3.9-3 3.9Z" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export default function Logo({ to = '/', light = false, className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${className}`}>
      <LogoMark inverted={light} />
      <span className={`text-lg font-semibold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>Testimonial MVP</span>
    </Link>
  );
}
