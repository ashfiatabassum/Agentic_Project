// Route guards (PRD §10 Q12).
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { safeNextPath } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';

function FullPageMessage({ children }) {
  return (
    <p role="status" className="p-16 text-center text-slate-500">
      {children}
    </p>
  );
}

/** /api/auth/me failed for a reason other than "not signed in" (server or network down). */
function ServerUnavailable({ message }) {
  return (
    <div role="alert" className="mx-auto mt-16 max-w-md rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
      <p className="font-medium text-slate-900">We could not reach the server.</p>
      <p className="mt-1 text-sm text-slate-600">{message}</p>
      <button type="button" onClick={() => window.location.reload()}
        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
        Try again
      </button>
    </div>
  );
}

/** Private pages: signed-out visitors go to /login?next=<this page>. */
export function RequireAuth() {
  const { status, user, signedOut, error } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageMessage>Loading…</FullPageMessage>;
  if (status === 'error') return <ServerUnavailable message={error} />;
  if (!user && signedOut) return <Navigate to="/login" replace />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

/** /login and /signup: signed-in owners go to ?next (same-site only) or the dashboard. */
export function GuestOnly() {
  const { status, user, error } = useAuth();
  const [searchParams] = useSearchParams();
  if (status === 'loading') return <FullPageMessage>Loading…</FullPageMessage>;
  if (status === 'error') return <ServerUnavailable message={error} />;
  if (user) return <Navigate to={safeNextPath(searchParams.get('next')) ?? '/dashboard'} replace />;
  return <Outlet />;
}
