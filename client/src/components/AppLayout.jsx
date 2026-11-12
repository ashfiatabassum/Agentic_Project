// Private header (E10): app name, owner name, plan badge, Log out.
import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button } from './ui.jsx';

export function PlanBadge({ plan }) {
  const paid = plan === 'paid';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${paid ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
      {paid ? 'Paid plan' : 'Free plan'}
    </span>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  // RequireAuth sends the owner to /login once the user is cleared. If the server could not
  // end the session, the owner stays signed in and sees why.
  async function handleLogout() {
    setLeaving(true);
    setLogoutError('');
    try {
      await logout();
    } catch (error) {
      setLogoutError(`Could not log out: ${error.message}`);
      setLeaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/dashboard" className="text-lg font-semibold text-slate-900">
            Testimonial MVP
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">{user.name}</span>
            <PlanBadge plan={user.plan} />
            <Button variant="ghost" onClick={handleLogout} disabled={leaving}>
              {leaving ? 'Logging out…' : 'Log out'}
            </Button>
          </div>
        </div>
        {logoutError && (
          <p role="alert" className="mx-auto max-w-5xl px-4 pb-3 text-sm text-red-700">{logoutError}</p>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
