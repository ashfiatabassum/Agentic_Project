import { useEffect, useState } from 'react';

// Scaffold page: confirms the client can reach the API (through the Vite proxy) and
// that the API can reach MySQL. Replaced by real routes in the first feature slice.
function useApiHealth() {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!data) throw new Error(`Unexpected response (HTTP ${res.status})`);
        setState({ loading: false, data, error: null });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setState({ loading: false, data: null, error: 'Cannot reach the API. Is the server running on port 4000?' });
        }
      });
    return () => controller.abort();
  }, []);

  return state;
}

function StatusRow({ label, value }) {
  const ok = value === 'ok';
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-slate-600">{label}</dt>
      <dd className={`rounded-full px-3 py-1 text-sm font-medium ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
        {value}
      </dd>
    </div>
  );
}

export default function App() {
  const { loading, data, error } = useApiHealth();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">Testimonial MVP</h1>
        <p className="mt-2 text-slate-600">Development scaffold: client, API, and database status.</p>

        <section className="mt-6" aria-live="polite">
          {loading && <p className="text-slate-500">Checking API…</p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
          {data && (
            <dl className="divide-y divide-slate-100">
              <StatusRow label="Client" value="ok" />
              <StatusRow label="API" value={data.api} />
              <StatusRow label="Database" value={data.database} />
            </dl>
          )}
        </section>
      </div>
    </main>
  );
}
