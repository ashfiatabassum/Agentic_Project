// Theme cards and brand colour (E6).
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { DEFAULT_BRAND_COLOR, HEX_RE, THEME_PREVIEW } from './spaceForm.js';

export default function LookSection({ themeCode, brandColor, onChange, errors }) {
  const [themes, setThemes] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api('/themes', { signal: controller.signal })
      .then((data) => setThemes(data.themes))
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError('Could not load themes.');
      });
    return () => controller.abort();
  }, []);

  const validColor = HEX_RE.test(brandColor) ? brandColor : DEFAULT_BRAND_COLOR;

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium text-slate-800">Theme</legend>
        {loadError && <p className="mt-1 text-sm text-red-700">{loadError}</p>}
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {themes.map((theme) => {
            const colors = THEME_PREVIEW[theme.code] ?? THEME_PREVIEW.light;
            return (
              <label key={theme.code} className="cursor-pointer rounded-xl p-1 ring-1 ring-slate-300 has-checked:ring-2 has-checked:ring-indigo-600 has-focus-visible:ring-2 has-focus-visible:ring-indigo-400">
                <input
                  type="radio"
                  name="theme"
                  className="sr-only"
                  aria-label={theme.name}
                  value={theme.code}
                  checked={themeCode === theme.code}
                  onChange={() => onChange({ themeCode: theme.code })}
                />
                <span aria-hidden="true" className="block rounded-lg p-3" style={{ backgroundColor: colors.background, color: colors.text }}>
                  <span className="block text-sm font-semibold">Aa Your space</span>
                  <span className="block text-xs" style={{ color: colors.muted }}>How was your experience?</span>
                  <span className="mt-2 inline-block rounded px-2 py-0.5 text-xs text-white" style={{ backgroundColor: validColor }}>Submit</span>
                </span>
                <span className="block px-2 py-1 text-sm font-medium text-slate-800">{theme.name}</span>
              </label>
            );
          })}
        </div>
        {errors.themeCode && <p className="mt-1 text-sm text-red-700">{errors.themeCode}</p>}
      </fieldset>

      <div>
        <label htmlFor="brand-color-text" className="block text-sm font-medium text-slate-800">Brand colour</label>
        <p className="text-xs text-slate-500">Used for buttons and highlights on your public page.</p>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            aria-label="Pick brand colour"
            value={validColor.toLowerCase()}
            onChange={(e) => onChange({ brandColor: e.target.value.toUpperCase() })}
            className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white"
          />
          <input
            id="brand-color-text"
            value={brandColor}
            maxLength={7}
            onChange={(e) => onChange({ brandColor: e.target.value.trim() })}
            aria-invalid={errors.brandColor ? true : undefined}
            aria-describedby={errors.brandColor ? 'brand-color-error' : undefined}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm aria-[invalid=true]:border-red-500"
          />
        </div>
        {errors.brandColor && <p id="brand-color-error" className="mt-1 text-sm text-red-700">{errors.brandColor}</p>}
      </div>
    </div>
  );
}
