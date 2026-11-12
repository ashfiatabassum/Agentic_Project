// Small static pages: the 404 page. (The /s/:slug placeholder was replaced by PublicSpacePage in M3.)
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
        <Link to="/" className="mt-4 inline-block text-indigo-700 underline">Go to the home page</Link>
      </div>
    </main>
  );
}
