// Embed builder /spaces/:id/embed (FR-10; plan.md E62–E65). Owner only: the space comes from the
// owner-scoped GET /api/spaces/:id (another owner's space → 404). The preview is a real iframe
// of the same /embed/:slug URL the snippet uses, so the owner sees exactly what visitors get.
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import Breadcrumbs, { SPACES_CRUMB, spaceCrumb } from '../components/Breadcrumbs.jsx';
import { Alert, Button } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { themeVars } from '../public/publicTheme.js';
import {
  DEFAULT_HEIGHT, defaultSettings, embedPath, embedSnippet, LAYOUTS, parseBackground, readResizeMessage,
} from '../embed/embedSettings.js';

const LAYOUT_INFO = {
  grid: { label: 'Grid', hint: 'Cards in up to 3 columns' },
  list: { label: 'List', hint: 'One card per row' },
  carousel: { label: 'Carousel', hint: 'One row you can scroll' },
};
// Hoisted so they are not rebuilt on every render (vercel-react-best-practices: rendering-hoist-jsx).
const LAYOUT_OPTIONS = LAYOUTS.map((value) => ({ value, ...LAYOUT_INFO[value] }));
const MODE_OPTIONS = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }];

/** value after it has stopped changing for `ms` (keeps the colour picker from reloading the preview on every move). */
function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function Segmented({ legend, name, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">{legend}</legend>
      <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <label key={o.value}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm ring-1 ring-slate-300 has-[:checked]:bg-indigo-50 has-[:checked]:ring-2 has-[:checked]:ring-indigo-500 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-indigo-400">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            <span className="block font-medium text-slate-900">{o.label}</span>
            {o.hint && <span className="block text-xs text-slate-500">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function BackgroundControl({ mode, bg, onChange }) {
  const id = useId();
  const modeDefault = themeVars(mode)['--page'];
  const transparent = bg === 'transparent';
  const shown = transparent ? modeDefault : bg ?? modeDefault;
  // The text field keeps what the owner is typing; only a valid colour reaches the settings.
  const [text, setText] = useState(shown);
  const [prevShown, setPrevShown] = useState(shown);
  if (shown !== prevShown) {
    setPrevShown(shown);
    setText(shown);
  }
  // Only a hex colour is valid here ("transparent" has its own checkbox).
  const invalid = !transparent && parseBackground(text)?.startsWith('#') !== true;

  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">Background colour</legend>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="color" aria-label="Pick a background colour" value={shown.toLowerCase()} disabled={transparent}
          onChange={(e) => onChange(parseBackground(e.target.value))}
          className="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-40" />
        <label htmlFor={`${id}-hex`} className="sr-only">Background colour as hex</label>
        <input id={`${id}-hex`} value={text} disabled={transparent} maxLength={7} spellCheck={false}
          aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(e) => {
            setText(e.target.value);
            const parsed = parseBackground(e.target.value);
            if (parsed && parsed !== 'transparent') onChange(parsed);
          }}
          className="w-28 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:text-slate-400 aria-[invalid=true]:border-red-500" />
        <Button variant="ghost" disabled={bg === null && text === shown}
          onClick={() => { setText(modeDefault); onChange(null); }}>Reset</Button>
      </div>
      {invalid && <p id={`${id}-error`} className="mt-1 text-sm text-red-700">Use a hex colour such as #F8FAFC.</p>}
      <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={transparent} onChange={(e) => onChange(e.target.checked ? 'transparent' : null)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400" />
        Transparent (your site&apos;s background shows through)
      </label>
      {transparent && <p className="mt-1 text-xs text-slate-500">Choose Light or Dark to match your site, so the text around the cards stays readable.</p>}
    </fieldset>
  );
}

function SnippetBox({ code }) {
  const ref = useRef(null);
  const timer = useRef();
  const [message, setMessage] = useState('');
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage('Copied!');
    } catch {
      // Clipboard blocked: select the code so it can be copied by hand.
      ref.current.focus();
      ref.current.select();
      setMessage('Press Ctrl+C (or ⌘C) to copy the selected code.');
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 4000);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="embed-code" className="text-sm font-medium text-slate-800">Embed code</label>
        <Button onClick={copy}>Copy code</Button>
      </div>
      <textarea id="embed-code" ref={ref} readOnly value={code} rows={9} spellCheck={false}
        onFocus={(e) => e.target.select()}
        className="mt-2 block w-full resize-y rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-100" />
      <p role="status" aria-live="polite" className="mt-1 min-h-5 text-sm text-emerald-700">{message}</p>
    </div>
  );
}

function Preview({ path }) {
  const frameRef = useRef(null);
  const [width, setWidth] = useState('desktop');
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  // The preview uses the same height messages as the pasted snippet (E65).
  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      const h = readResizeMessage(e.data);
      if (h) setHeight(h);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <section aria-labelledby="preview-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="preview-heading" className="text-lg font-semibold text-slate-900">Live preview</h2>
        <div role="group" aria-label="Preview width" className="inline-flex rounded-lg ring-1 ring-slate-300">
          {[['desktop', 'Desktop'], ['mobile', 'Mobile (375 px)']].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={width === value} onClick={() => setWidth(value)}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 first:rounded-l-lg last:rounded-r-lg aria-pressed:bg-indigo-600 aria-pressed:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* Checkered backdrop so a transparent background is visible as such. */}
      <div className="mt-3 overflow-x-auto rounded-xl bg-slate-100 bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%),linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] p-4 ring-1 ring-slate-200">
        {/* No sandbox here: this frame is same-origin with the builder, where allow-scripts +
            allow-same-origin would protect nothing. The pasted snippet keeps it (cross-origin there). */}
        <iframe ref={frameRef} src={path} title="Embed preview"
          style={{ height }}
          className={`mx-auto block border-0 ${width === 'mobile' ? 'w-[375px] max-w-none' : 'w-full'}`} />
      </div>
    </section>
  );
}

export default function EmbedBuilderPage() {
  const { id } = useParams();
  const [state, setState] = useState({ space: null, wallCount: null, error: '' });
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    // A different space id starts from scratch, so another space's snippet is never shown.
    setState({ space: null, wallCount: null, error: '' });
    setSettings(null);
    let space = null;
    (async () => {
      try {
        ({ space } = await api(`/spaces/${id}`, { signal: controller.signal }));
        setState({ space, wallCount: null, error: '' });
        setSettings(defaultSettings(space.themeCode));
        const wall = await api(`/public/spaces/${encodeURIComponent(space.slug)}/wall`, { signal: controller.signal });
        setState({ space, wallCount: wall.testimonials.length, error: '' });
      } catch (error) {
        if (error.name === 'AbortError') return;
        // Only the space read is required; the wall count is a hint and the builder works without it.
        if (!space) setState({ space: null, wallCount: null, error: error.status === 404 ? 'Space not found.' : error.message });
      }
    })();
    return () => controller.abort();
  }, [id]);

  // E63: only the colour is debounced (the picker fires while dragging); other controls update at once.
  const debouncedBg = useDebounced(settings?.bg ?? null, 300);
  const previewPath = state.space && settings ? embedPath(state.space.slug, { ...settings, bg: debouncedBg }) : '';

  if (state.error) {
    return (
      <div>
        <Breadcrumbs items={[SPACES_CRUMB, { label: 'Embed' }]} />
        <Alert>{state.error}</Alert>
      </div>
    );
  }
  if (!state.space || !settings) return <p role="status" className="text-slate-500">Loading…</p>;

  const { space, wallCount } = state;
  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));
  const code = embedSnippet({ origin: window.location.origin, slug: space.slug, title: space.title, settings });

  return (
    <div>
      <Breadcrumbs items={[SPACES_CRUMB, spaceCrumb(space), { label: 'Embed' }]} />
      <h1 className="text-2xl font-semibold text-slate-900">Embed your Wall of Love</h1>
      <p className="mt-1 text-sm text-slate-600">
        Show the testimonials from your <a href={`/s/${space.slug}/wall`} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-700 underline">Wall of Love ↗</a> on your own website.
        Only testimonials you added to the wall, with the customer&apos;s permission, appear.
      </p>

      {wallCount === 0 && (
        <div role="status" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Your wall is empty — <Link to={`/spaces/${space.id}/inbox`} className="font-medium underline">add testimonials from the inbox</Link> and they will appear here.
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <form className="space-y-6 self-start rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200" onSubmit={(e) => e.preventDefault()} aria-label="Embed settings">
          <Segmented legend="Layout" name="layout" value={settings.layout} onChange={(layout) => update({ layout })}
            options={LAYOUT_OPTIONS} />
          <Segmented legend="Mode" name="mode" value={settings.mode} onChange={(mode) => update({ mode })}
            options={MODE_OPTIONS} />
          <BackgroundControl mode={settings.mode} bg={settings.bg} onChange={(bg) => update({ bg })} />
          <label className="flex items-start gap-3">
            <input type="checkbox" role="switch" checked={settings.header} onChange={(e) => update({ header: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400" />
            <span>
              <span className="block text-sm font-medium text-slate-800">Show logo and name</span>
              <span className="block text-xs text-slate-500">Your saved logo (or initial) and “{space.title}” above the cards.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" role="switch" checked={settings.animate} onChange={(e) => update({ animate: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400" />
            <span>
              <span className="block text-sm font-medium text-slate-800">Animation</span>
              <span className="block text-xs text-slate-500">Cards fade in and the carousel scrolls smoothly. Visitors who ask their device for reduced motion never see animation.</span>
            </span>
          </label>
        </form>

        <div className="min-w-0 space-y-6">
          <Preview path={previewPath} />
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <SnippetBox code={code} />
            <p className="text-sm text-slate-600">
              Paste this where the testimonials should appear. The frame fills the width of its container and grows to fit.
              If you change this space&apos;s public link, copy the code again.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
