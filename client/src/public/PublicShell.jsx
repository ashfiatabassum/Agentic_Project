// Page frame for public pages (collection form, Wall of Love): the space's theme colours as CSS
// variables, page background, and the small "Collected with" footer.
import { Link } from 'react-router';

export default function PublicShell({ vars, width = 'max-w-2xl', children }) {
  return (
    <main style={vars} className="min-h-screen bg-[var(--page)] px-4 py-10 text-[var(--text)] sm:py-16">
      <div className={`mx-auto w-full ${width}`}>{children}</div>
      <p className="mt-10 text-center text-xs text-[var(--muted)]">
        Collected with <Link to="/" className="underline underline-offset-2 hover:text-[var(--text)]">Testimonial MVP</Link>
      </p>
    </main>
  );
}
