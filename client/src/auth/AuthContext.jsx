// Current owner for the whole app (E12). Calls GET /api/auth/me once on load.
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // status: 'loading' until /me answers, then 'ready' (user is null when signed out), or
  // 'error' when the server could not answer — that is not the same as being signed out.
  const [state, setState] = useState({ status: 'loading', user: null });

  useEffect(() => {
    const controller = new AbortController();
    api('/auth/me', { signal: controller.signal })
      .then((data) => setState({ status: 'ready', user: data.user }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState(error.status === 401 ? { status: 'ready', user: null } : { status: 'error', user: null, error: error.message });
      });
    return () => controller.abort();
  }, []);

  // A 401 from any private API means the session ended: forget the user so the route guard
  // sends them to /login?next=<current page>.
  useEffect(() => {
    setUnauthorizedHandler(() => setState({ status: 'ready', user: null }));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    setState({ status: 'ready', user: data.user });
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await api('/auth/register', { method: 'POST', body: { name, email, password } });
    setState({ status: 'ready', user: data.user });
  }, []);

  // signedOut tells the route guard this was a deliberate log out, so it goes to plain /login
  // instead of /login?next=<page the owner just left>. If the server could not end the session
  // (network or server error), the owner stays signed in and the error is re-thrown.
  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (error) {
      if (error.status !== 401) throw error;
    }
    setState({ status: 'ready', user: null, signedOut: true });
  }, []);

  const value = useMemo(() => ({ ...state, login, register, logout }), [state, login, register, logout]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
