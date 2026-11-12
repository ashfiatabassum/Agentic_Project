// Delete space (E9): the owner types the space name; the dialog says how many testimonials go with it.
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { Alert, Button } from '../components/ui.jsx';

export default function DeleteSpaceDialog({ space, open, onClose, onDeleted }) {
  const dialogRef = useRef(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleClose() {
    setTyped('');
    setError('');
    onClose();
  }

  async function handleDelete(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/spaces/${space.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const count = space.testimonialCount;
  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      aria-labelledby="delete-space-title"
      className="m-auto w-full max-w-md rounded-2xl p-6 shadow-xl backdrop:bg-slate-900/50"
    >
      <form onSubmit={handleDelete} className="space-y-4">
        <h2 id="delete-space-title" className="text-lg font-semibold text-slate-900">Delete “{space.title}”?</h2>
        <p className="text-sm text-slate-700">
          This permanently deletes the space, its public link, its logo, and{' '}
          <strong>{count} {count === 1 ? 'testimonial' : 'testimonials'}</strong>. This cannot be undone.
        </p>
        <div>
          <label htmlFor="confirm-space-name" className="block text-sm font-medium text-slate-800">
            Type <strong>{space.title}</strong> to confirm
          </label>
          <input
            id="confirm-space-name"
            value={typed}
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <Alert>{error}</Alert>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => dialogRef.current.close()}>Cancel</Button>
          <Button type="submit" variant="danger" disabled={busy || typed !== space.title}>
            {busy ? 'Deleting…' : 'Delete space'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
