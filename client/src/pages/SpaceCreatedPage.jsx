// "Space created" (E13): public link with Copy, then Edit or Dashboard.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../lib/api.js';
import { Alert, CopyButton, publicSpaceUrl } from '../components/ui.jsx';

export default function SpaceCreatedPage() {
  const { id } = useParams();
  const [state, setState] = useState({ space: null, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    api(`/spaces/${id}`, { signal: controller.signal })
      .then((data) => setState({ space: data.space, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ space: null, error: error.status === 404 ? 'Space not found.' : error.message });
      });
    return () => controller.abort();
  }, [id]);

  if (state.error) return <Alert>{state.error}</Alert>;
  if (!state.space) return <p role="status" className="text-slate-500">Loading…</p>;

  const url = publicSpaceUrl(state.space.slug);
  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <p className="text-4xl" aria-hidden="true">🎉</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">“{state.space.title}” is ready</h1>
      <p className="mt-2 text-slate-600">Share this link with your customers so they can leave a testimonial.</p>
      <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row">
        <label htmlFor="public-link" className="sr-only">Public link</label>
        <input id="public-link" readOnly value={url} onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-800" />
        <CopyButton text={url} />
      </div>
      <p className="mt-2 text-xs text-slate-500">The public collection page is coming in the next milestone.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to={`/spaces/${state.space.id}/edit`} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50">
          Edit space
        </Link>
        <Link to="/dashboard" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
