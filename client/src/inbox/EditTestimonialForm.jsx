// Inline edit form in the inbox detail panel (E44). Email, consents, and answers are not editable;
// the photo can only be removed. The server validates; field errors come back as { fields }.
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Field, TextInput } from '../components/ui.jsx';
import { api } from '../lib/api.js';

const toForm = (t) => ({
  name: t.name, jobTitle: t.jobTitle, company: t.company, socialLink: t.socialLink,
  rating: t.rating ?? '', body: t.body, removePhoto: false,
});

export default function EditTestimonialForm({ spaceId, testimonial, onSaved, onCancel }) {
  const [form, setForm] = useState(() => toForm(testimonial));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const firstRef = useRef(null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => { firstRef.current?.focus(); }, []);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      const { removePhoto, rating, ...rest } = form;
      const body = { ...rest, rating: rating === '' ? null : Number(rating) };
      if (removePhoto) body.removePhoto = true;
      const data = await api(`/spaces/${spaceId}/testimonials/${testimonial.id}/content`, { method: 'PUT', body });
      onSaved(data.testimonial);
    } catch (error) {
      setErrors(error.fields ?? {});
      setFormError(error.fields && Object.keys(error.fields).length ? 'Please fix the highlighted fields.' : error.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-4" aria-labelledby="edit-heading">
      <h3 id="edit-heading" className="text-lg font-semibold text-slate-900">Edit testimonial</h3>
      <p className="text-sm text-slate-600">
        Changes are marked as edited, and the customer&apos;s original text is kept. Email and consent cannot be changed.
      </p>
      <Alert>{formError}</Alert>
      <TextInput ref={firstRef} label="Name" required maxLength={100} value={form.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Job title" maxLength={100} value={form.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} error={errors.jobTitle} />
        <TextInput label="Company" maxLength={100} value={form.company} onChange={(e) => set({ company: e.target.value })} error={errors.company} />
      </div>
      <TextInput label="Social or website link" type="url" maxLength={300} value={form.socialLink} onChange={(e) => set({ socialLink: e.target.value })} error={errors.socialLink} />
      <Field label="Rating" error={errors.rating}>
        {(a11y) => (
          <select {...a11y} value={form.rating} onChange={(e) => set({ rating: e.target.value })}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="">No rating</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'star' : 'stars'}</option>)}
          </select>
        )}
      </Field>
      <TextInput label="Testimonial" required multiline rows={6} maxLength={2000} value={form.body} onChange={(e) => set({ body: e.target.value })} error={errors.body} />
      {testimonial.photoUrl && (
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input type="checkbox" checked={form.removePhoto} onChange={(e) => set({ removePhoto: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
          Remove the photo
        </label>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </form>
  );
}
