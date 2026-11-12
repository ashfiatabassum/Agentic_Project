// Embed settings (plan.md E61, E64, E65, E73). They live only in the iframe URL (data-model D7):
//   /embed/:slug?layout=grid&mode=light&bg=F8FAFC&header=1&animate=1
// Every value is whitelisted; an unknown or missing value falls back to its default, never an
// error. Plain JS (no React, no browser globals) so server/test/embed.test.js can test it.

export const LAYOUTS = ['grid', 'list', 'carousel'];
export const MODES = ['light', 'dark'];
export const RESIZE_MESSAGE = 'testimonial-mvp:resize';
// Heights are clamped to this range (E65, revised after the code review): a very tall wall gets
// an inner scroll bar at MAX_HEIGHT instead of being ignored, and a short state still shrinks.
export const MIN_HEIGHT = 50;
export const MAX_HEIGHT = 10000;
export const DEFAULT_HEIGHT = 480; // used when the host page strips the resize script

/** E69: no allow-top-navigation and no allow-forms, so an embed can never redirect the host page. */
export const SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';

const HEX6 = /^[0-9a-f]{6}$/i;

/** Defaults for a space: dark mode only when the space's own theme is dark; header shown (FR-04). */
export function defaultSettings(themeCode) {
  return { layout: 'grid', mode: themeCode === 'dark' ? 'dark' : 'light', bg: null, header: true, animate: true };
}

function pick(value, allowed, fallback) {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return allowed.includes(v) ? v : fallback;
}

function flag(value, fallback) {
  return value === '0' ? false : value === '1' ? true : fallback;
}

/**
 * bg: 'transparent', '#RRGGBB' (upper case), or null for "the mode's page colour".
 * Accepts 6 hex digits with or without '#', in any case.
 */
export function parseBackground(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (v.toLowerCase() === 'transparent') return 'transparent';
  const hex = v.startsWith('#') ? v.slice(1) : v;
  return HEX6.test(hex) ? `#${hex.toUpperCase()}` : null;
}

/** search: a URLSearchParams or a query string. */
export function parseEmbedSettings(search, themeCode) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search ?? '');
  const d = defaultSettings(themeCode);
  return {
    layout: pick(params.get('layout'), LAYOUTS, d.layout),
    mode: pick(params.get('mode'), MODES, d.mode),
    bg: parseBackground(params.get('bg')),
    header: flag(params.get('header'), d.header),
    animate: flag(params.get('animate'), d.animate),
  };
}

/** The embed page path with only whitelisted parameters, e.g. /embed/acme?layout=grid&… */
export function embedPath(slug, settings) {
  const s = parseEmbedSettings(new URLSearchParams({
    layout: String(settings?.layout ?? ''),
    mode: String(settings?.mode ?? ''),
    bg: String(settings?.bg ?? ''),
    header: settings?.header === false ? '0' : '1',
    animate: settings?.animate === false ? '0' : '1',
  }));
  const params = new URLSearchParams({ layout: s.layout, mode: s.mode });
  if (s.bg) params.set('bg', s.bg === 'transparent' ? 'transparent' : s.bg.slice(1));
  params.set('header', s.header ? '1' : '0');
  params.set('animate', s.animate ? '1' : '0');
  return `/embed/${encodeURIComponent(slug)}?${params}`;
}

/** Escapes text for an HTML attribute value or element content. */
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/**
 * The code the owner pastes into their site: a full-width iframe (responsive) plus a small
 * script that sets its height from the embed's resize messages (E65). The script accepts a
 * message only from the embed's origin and only from one of these iframes, and clamps the height.
 * Without the script the iframe keeps DEFAULT_HEIGHT and scrolls inside.
 */
export function embedSnippet({ origin, slug, title, settings }) {
  const src = `${origin}${embedPath(slug, settings)}`;
  // JSON string literal; '<' escaped so the value can never close the <script> element.
  const originLiteral = JSON.stringify(String(origin)).replace(/</g, '\\u003c');
  return [
    `<iframe data-testimonial-mvp src="${escapeHtml(src)}" title="${escapeHtml(`Testimonials for ${title}`)}"`,
    `  loading="lazy" referrerpolicy="strict-origin-when-cross-origin" style="width:100%;height:${DEFAULT_HEIGHT}px;border:0;"`,
    `  sandbox="${SANDBOX}"></iframe>`,
    '<script>',
    '(function () {',
    `  var origin = ${originLiteral};`,
    '  window.addEventListener("message", function (e) {',
    `    if (e.origin !== origin || !e.data || e.data.type !== "${RESIZE_MESSAGE}") return;`,
    '    var h = Number(e.data.height);',
    '    if (!isFinite(h)) return;',
    `    h = Math.min(${MAX_HEIGHT}, Math.max(${MIN_HEIGHT}, Math.ceil(h)));`,
    '    var frames = document.querySelectorAll("iframe[data-testimonial-mvp]");',
    '    for (var i = 0; i < frames.length; i++) {',
    '      if (frames[i].contentWindow === e.source) frames[i].style.height = h + "px";',
    '    }',
    '  });',
    '})();',
    '</script>',
  ].join('\n');
}

/** Height from a resize message, clamped; null if it is not a valid message. Used by the builder's preview. */
export function readResizeMessage(data) {
  if (!data || data.type !== RESIZE_MESSAGE) return null;
  const h = Number(data.height);
  return Number.isFinite(h) ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(h))) : null;
}
