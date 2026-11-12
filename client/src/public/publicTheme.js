// Colours for the public collection page (E26), keyed by theme code. The brand colour is the
// owner's accent; its text colour is chosen for contrast so any brand colour stays readable.
import { THEME_PREVIEW } from '../spaces/spaceForm.js';

// starEmpty is a neutral grey so unrated stars never look like filled amber ones
// (the warm theme's orange border colour did, found in the M3 browser check).
const SURFACES = {
  light: { card: '#FFFFFF', page: '#F8FAFC', border: '#CBD5E1', input: '#FFFFFF', danger: '#B91C1C', starEmpty: '#CBD5E1' },
  dark: { card: '#1E293B', page: '#0F172A', border: '#475569', input: '#0F172A', danger: '#FCA5A5', starEmpty: '#475569' },
  warm: { card: '#FFFFFF', page: '#FFF7ED', border: '#FDBA74', input: '#FFFFFF', danger: '#B91C1C', starEmpty: '#D6D3D1' },
};

/** Relative luminance (WCAG) of a #RRGGBB colour. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** White or near-black text, whichever contrasts more with the brand colour. */
export function textOn(hex) {
  const l = luminance(hex);
  return contrast(l, 1) >= contrast(l, luminance('#0F172A')) ? '#FFFFFF' : '#0F172A';
}

/** CSS custom properties for a space's theme and brand colour. */
export function themeVars(themeCode, brandColor) {
  const base = THEME_PREVIEW[themeCode] ?? THEME_PREVIEW.light;
  const surface = SURFACES[themeCode] ?? SURFACES.light;
  const brand = /^#[0-9A-Fa-f]{6}$/.test(brandColor ?? '') ? brandColor : '#4F46E5';
  return {
    '--page': surface.page,
    '--card': surface.card,
    '--text': base.text,
    '--muted': base.muted,
    '--border': surface.border,
    '--input': surface.input,
    '--danger': surface.danger,
    '--star-empty': surface.starEmpty,
    '--brand': brand,
    '--on-brand': textOn(brand),
  };
}
