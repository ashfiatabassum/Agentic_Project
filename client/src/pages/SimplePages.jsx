// Small static pages: the M3 placeholder for /s/:slug and a 404 page.
import { Link, useParams } from 'react-router';

/** /s/:slug — the public collection form arrives in M3 (E13). */
export function PublicSpaceComingSoon() {
  const { slug } = useParams();
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Coming soon</h1>
        <p className="mt-2 text-slate-600">
          The testimonial form for <strong>{slug}</strong> is not available yet.
        </p>
      </div>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-indigo-700 underline">Go to dashboard</Link>
      </div>
    </main>
  );
}
