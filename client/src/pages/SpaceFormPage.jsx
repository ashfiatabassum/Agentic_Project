// /spaces/new and /spaces/:id/edit (E2): one page — Basics, Public link, Questions,
// Customer fields, Look — with one Save button and inline errors from the server.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '../lib/api.js';
import Breadcrumbs, { SPACES_CRUMB, spaceCrumb } from '../components/Breadcrumbs.jsx';
import { Alert, Button, TextInput, publicSpaceUrl } from '../components/ui.jsx';
import DeleteSpaceDialog from '../spaces/DeleteSpaceDialog.jsx';
import FieldModes from '../spaces/FieldModes.jsx';
import LogoUploader from '../spaces/LogoUploader.jsx';
import LookSection from '../spaces/LookSection.jsx';
import QuestionsEditor from '../spaces/QuestionsEditor.jsx';
import { emptySpaceForm, formFromSpace, payloadFromForm, randomSlugSuffix, slugify } from '../spaces/spaceForm.js';

function Section({ id, title, description, children }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 id={id} className="text-lg font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function SlugStatus({ check, onUseSuggestion }) {
  if (check.status === 'checking') return <p className="mt-1 text-sm text-slate-500">Checking…</p>;
  if (check.status === 'available') return <p className="mt-1 text-sm text-emerald-700">✓ This link is available</p>;
  if (check.status === 'taken') {
    return (
      <p className="mt-1 text-sm text-amber-800">
        This link is already taken.
        {check.suggestion && (
          <> <button type="button" className="font-medium underline" onClick={() => onUseSuggestion(check.suggestion)}>Use {check.suggestion}</button></>
        )}
      </p>
    );
  }
  if (check.status === 'invalid') return <p className="mt-1 text-sm text-red-700">{check.message}</p>;
  return null;
}

function SpaceForm({ initialSpace }) {
  const isEdit = Boolean(initialSpace);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => (isEdit ? formFromSpace(initialSpace) : emptySpaceForm()));
  const [space, setSpace] = useState(initialSpace); // last saved server copy (edit only)
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [fallbackSuffix] = useState(randomSlugSuffix);
  const [slugCheck, setSlugCheck] = useState({ status: 'idle' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const slugRequest = useRef(0);
  const summaryRef = useRef(null);

  const autoSlug = (title) => slugify(title) || `space-${fallbackSuffix}`;

  function update(patch) {
    setSavedMessage('');
    if ('title' in patch && !slugTouched) setSlugCheck({ status: 'idle' }); // new auto slug is unchecked
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if ('title' in patch && !slugTouched) next.slug = autoSlug(patch.title);
      return next;
    });
  }

  async function checkSlug(slug) {
    const request = (slugRequest.current += 1);
    if (!slug) return setSlugCheck({ status: 'idle' });
    setSlugCheck({ status: 'checking' });
    try {
      const query = new URLSearchParams({ slug, ...(space ? { spaceId: String(space.id) } : {}) });
      const result = await api(`/spaces/slug-available?${query}`);
      if (request !== slugRequest.current) return;
      if (result.available) setSlugCheck({ status: 'available' });
      else if (result.error) setSlugCheck({ status: 'invalid', message: result.error });
      else setSlugCheck({ status: 'taken', suggestion: result.suggestion });
    } catch {
      if (request === slugRequest.current) setSlugCheck({ status: 'idle' });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError('');
    setSavedMessage('');
    try {
      const body = payloadFromForm(form);
      if (!isEdit) {
        const data = await api('/spaces', { method: 'POST', body });
        navigate(`/spaces/${data.space.id}/created`);
        return;
      }
      const data = await api(`/spaces/${space.id}`, { method: 'PUT', body });
      setSpace(data.space);
      setForm(formFromSpace(data.space)); // new questions now have ids
      setSlugCheck({ status: 'idle' });
      setSavedMessage('Changes saved.');
    } catch (err) {
      setErrors(err.fields ?? {});
      setFormError(err.status === 400 ? 'Please fix the highlighted fields.' : err.message);
      requestAnimationFrame(() => summaryRef.current?.focus());
    } finally {
      setSaving(false);
    }
  }

  const slugChanged = isEdit && form.slug !== space.slug;

  return (
    <>
      <Breadcrumbs items={isEdit ? [SPACES_CRUMB, spaceCrumb(space), { label: 'Edit' }] : [SPACES_CRUMB, { label: 'New space' }]} />
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">{isEdit ? `Edit “${space.title}”` : 'Create a space'}</h1>

        <div ref={summaryRef} tabIndex={-1} className="focus:outline-none">
          <Alert>{formError}</Alert>
        </div>

        {/* Disabled while saving, so nothing typed during the save is overwritten by the server copy. */}
        <fieldset disabled={saving} className="min-w-0 space-y-6">
        <Section id="basics" title="Basics" description="What customers see at the top of your collection page.">
          <TextInput label="Space name" required maxLength={100} value={form.title} error={errors.title}
            onChange={(e) => update({ title: e.target.value })}
            onBlur={() => !slugTouched && checkSlug(form.slug)} />
          <TextInput label="Subtitle" maxLength={200} value={form.subtitle} error={errors.subtitle}
            onChange={(e) => update({ subtitle: e.target.value })} />
          <TextInput label="Collection prompt" required multiline maxLength={500} value={form.prompt} error={errors.prompt}
            hint="For example: How was your experience working with us?"
            onChange={(e) => update({ prompt: e.target.value })} />
          <TextInput label="Thank-you message" multiline maxLength={500} value={form.thankYouMessage} error={errors.thankYouMessage}
            hint="Shown after a customer submits. Leave empty for the default message."
            onChange={(e) => update({ thankYouMessage: e.target.value })} />
        </Section>

        <Section id="public-link" title="Public link" description="Customers open this link to leave a testimonial. No account needed.">
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-slate-800">
              Link<span className="text-red-600" aria-hidden="true"> *</span>
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-indigo-200">
              <span className="pl-3 text-sm text-slate-500">{window.location.origin}/s/</span>
              <input
                id="slug"
                required
                maxLength={60}
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlugCheck({ status: 'idle' });
                  update({ slug: e.target.value.toLowerCase() });
                }}
                onBlur={() => checkSlug(form.slug)}
                aria-invalid={errors.slug ? true : undefined}
                aria-describedby="slug-hint slug-error"
                className="min-w-0 flex-1 rounded-r-lg py-2 pr-3 focus:outline-none"
              />
            </div>
            <p id="slug-hint" className="mt-1 text-xs text-slate-500">3–60 lowercase letters, numbers, and hyphens.</p>
            <div id="slug-error" aria-live="polite">
              {errors.slug
                ? <p className="mt-1 text-sm text-red-700">{errors.slug}</p>
                : <SlugStatus check={slugCheck} onUseSuggestion={(s) => { setSlugTouched(true); update({ slug: s }); checkSlug(s); }} />}
            </div>
            {slugChanged && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900 ring-1 ring-amber-200">
                The old link <strong>{publicSpaceUrl(space.slug)}</strong> will stop working after you save.
              </p>
            )}
          </div>
        </Section>

        <Section id="questions" title="Questions" description="Optional prompts shown above the testimonial box (up to 5).">
          <QuestionsEditor questions={form.questions} errors={errors} onChange={(questions) => update({ questions })} />
        </Section>

        <Section id="customer-fields" title="Customer fields" description="Choose what to ask customers besides their testimonial.">
          <FieldModes fields={form.fields} onChange={(fields) => update({ fields })} />
        </Section>

        <Section id="look" title="Look" description="Theme and colours of your public page.">
          <LookSection themeCode={form.themeCode} brandColor={form.brandColor} errors={errors} onChange={update} />
          {isEdit
            ? <LogoUploader spaceId={space.id} logoUrl={space.logoUrl} onChange={(logoUrl) => setSpace((s) => ({ ...s, logoUrl }))} />
            : <p className="text-sm text-slate-600">You can upload a logo after the space is created.</p>}
        </Section>
        </fieldset>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-200 bg-slate-50/95 py-4">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create space'}
          </Button>
          <Alert tone="success">{savedMessage}</Alert>
        </div>
      </form>

      {isEdit && (
        <section aria-labelledby="danger-zone" className="mt-10 rounded-2xl p-6 ring-1 ring-red-200">
          <h2 id="danger-zone" className="text-lg font-semibold text-red-800">Delete this space</h2>
          <p className="mt-1 text-sm text-slate-700">Deletes the space and all of its testimonials.</p>
          <Button variant="danger" className="mt-3" onClick={() => setDeleteOpen(true)}>Delete space…</Button>
          <DeleteSpaceDialog
            space={space}
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onDeleted={() => navigate('/dashboard', { replace: true })}
          />
        </section>
      )}
    </>
  );
}

export function NewSpacePage() {
  return <SpaceForm initialSpace={null} />;
}

export function EditSpacePage() {
  const { id } = useParams();
  const [state, setState] = useState({ space: null, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ space: null, error: '' });
    api(`/spaces/${id}`, { signal: controller.signal })
      .then((data) => setState({ space: data.space, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ space: null, error: error.status === 404 ? 'Space not found.' : error.message });
      });
    return () => controller.abort();
  }, [id]);

  if (state.error) {
    return (
      <div>
        <Breadcrumbs items={[SPACES_CRUMB, { label: 'Edit' }]} />
        <Alert>{state.error}</Alert>
      </div>
    );
  }
  if (!state.space) {
    return (
      <div>
        <Breadcrumbs items={[SPACES_CRUMB, { label: 'Edit' }]} />
        <p role="status" className="text-slate-500">Loading space…</p>
      </div>
    );
  }
  return <SpaceForm key={state.space.id} initialSpace={state.space} />;
}
