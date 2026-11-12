// Logo upload, replace, remove (E7). Only shown once the space exists. The server checks the
// real file type and size; the client check below only gives faster feedback.
import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { Button } from '../components/ui.jsx';

const MAX_BYTES = 2 * 1024 * 1024;

export default function LogoUploader({ spaceId, logoUrl, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function upload(file) {
    setError('');
    if (file.size > MAX_BYTES) {
      setError('The logo must be 2 MB or smaller.');
      return;
    }
    const form = new FormData();
    form.append('logo', file);
    setBusy(true);
    try {
      const data = await api(`/spaces/${spaceId}/logo`, { method: 'POST', form });
      onChange(data.logoUrl);
    } catch (err) {
      setError(err.fields?.logo ?? err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    setError('');
    setBusy(true);
    try {
      await api(`/spaces/${spaceId}/logo`, { method: 'DELETE' });
      onChange(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-slate-800">Logo</p>
      <p className="text-xs text-slate-500">JPEG, PNG, or WebP, up to 2 MB. Optional.</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {logoUrl
          ? <img src={logoUrl} alt="Current logo" className="h-16 w-16 rounded-lg bg-white object-contain ring-1 ring-slate-200" />
          : <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">No logo</span>}
        <input
          ref={inputRef}
          id="logo-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="peer sr-only"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <label
          htmlFor="logo-file"
          className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
        >
          {busy ? 'Working…' : logoUrl ? 'Replace logo' : 'Upload logo'}
        </label>
        {logoUrl && <Button variant="ghost" onClick={remove} disabled={busy}>Remove logo</Button>}
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
