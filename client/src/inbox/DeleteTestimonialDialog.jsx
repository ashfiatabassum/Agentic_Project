// Delete confirmation (E46). A native modal <dialog>: focus stays inside, Escape cancels.
// Cancel is focused first so pressing Enter by accident does not delete.
import { useEffect, useRef, useState } from 'react';
import { Alert, Button } from '../components/ui.jsx';
import { api } from '../lib/api.js';

export default function DeleteTestimonialDialog({ spaceId, testimonial, open, onClose, onDeleted }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleClose() {
    setError('');
    setBusy(false);
    onClose();
  }

  async function handleDelete() {
    setBusy(true);
    setError('');
    try {
      await api(`/spaces/${spaceId}/testimonials/${testimonial.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setError(err.status === 404 ? 'This testimonial was already deleted.' : err.message);
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialogRef} onClose={handleClose} aria-labelledby="delete-testimonial-title"
      className="m-auto w-full max-w-md rounded-2xl p-6 shadow-xl backdrop:bg-slate-900/50">
      <div className="space-y-4">
        <h2 id="delete-testimonial-title" className="text-lg font-semibold text-slate-900">Delete this testimonial?</h2>
        <p className="text-sm text-slate-700">
          The testimonial from <strong>{testimonial.name}</strong>, its answers, and its photo will be deleted. This cannot be undone.
        </p>
        <Alert>{error}</Alert>
        <div className="flex justify-end gap-2">
          <Button ref={cancelRef} variant="secondary" onClick={() => dialogRef.current.close()}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete testimonial'}</Button>
        </div>
      </div>
    </dialog>
  );
}
