// Dashboard, M2 version (E10): space usage and space cards. Statistics arrive in M6.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api.js';
import { Alert, CopyButton, publicSpaceUrl } from '../components/ui.jsx';

function SpaceCard({ space }) {
  const url = publicSpaceUrl(space.slug);
  return (
    <li className="flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        {space.logoUrl
          ? <img src={space.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain ring-1 ring-slate-200" />
          : <span aria-hidden="true" className="h-10 w-10 rounded-lg" style={{ backgroundColor: space.brandColor }} />}
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">{space.title}</h2>
      </div>
      <p className="mt-3 truncate text-sm text-slate-600" title={url}>{url}</p>
      <p className="mt-1 text-sm text-slate-600">
        {space.testimonialCount} {space.testimonialCount === 1 ? 'testimonial' : 'testimonials'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/spaces/${space.id}/edit`} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Edit<span className="sr-only"> {space.title}</span>
        </Link>
        <CopyButton text={url} />
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    api('/spaces', { signal: controller.signal })
      .then((data) => setState({ status: 'ready', data, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: 'error', data: null, error: error.message });
      });
    return () => controller.abort();
  }, []);

  if (state.status === 'loading') return <p role="status" className="text-slate-500">Loading your spaces…</p>;
  if (state.status === 'error') return <Alert>{state.error}</Alert>;

  const { spaces, usage } = state.data;
  const atLimit = usage.spacesUsed >= usage.spacesMax;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Your spaces</h1>
          <p className="mt-1 text-sm text-slate-600">
            Spaces: <strong>{usage.spacesUsed} of {usage.spacesMax}</strong> on the {usage.planName} plan
          </p>
        </div>
        <div className="text-right">
          {atLimit ? (
            <>
              <button type="button" disabled aria-describedby="space-limit-note" className="cursor-not-allowed rounded-lg bg-indigo-300 px-4 py-2 text-sm font-medium text-white">
                Create space
              </button>
              <p id="space-limit-note" className="mt-1 max-w-xs text-xs text-slate-600">
                You have reached the {usage.planName} plan limit of {usage.spacesMax} spaces. Delete a space to make room.
              </p>
            </>
          ) : (
            <Link to="/spaces/new" className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Create space
            </Link>
          )}
        </div>
      </div>

      {spaces.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-slate-300 p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No spaces yet</h2>
          <p className="mt-1 text-slate-600">Create a space to get a public link where customers can leave testimonials.</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => <SpaceCard key={space.id} space={space} />)}
        </ul>
      )}
    </div>
  );
}
