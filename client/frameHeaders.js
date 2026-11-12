// Which client pages may be shown inside an <iframe> (plan.md E68). Plain JS with no imports, so
// the Vite config and the server tests (server/test/embed.test.js) use the same rule.
//
// Only the public embed page /embed/:slug may be framed, by any site. Every other page (owner
// pages, login, the public form, the wall) refuses to be framed, which prevents clickjacking.

// Exactly one non-empty path segment after /embed/ (an optional trailing slash is allowed).
// /spaces/1/embed, /embed, /embed/ and /embed/a/b do not match. Case-insensitive like the
// router, so /Embed/acme (which renders the embed) is frameable too.
const EMBED_PATH = /^\/embed\/[^/]+\/?$/i;

export const FRAMEABLE_HEADERS = Object.freeze({
  'Content-Security-Policy': 'frame-ancestors *',
});

export const NOT_FRAMEABLE_HEADERS = Object.freeze({
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
});

/** True if the request URL (path, optionally with a query string) is the embed page. */
export function isFrameablePath(url) {
  const path = String(url ?? '').split(/[?#]/, 1)[0];
  return EMBED_PATH.test(path);
}

/** Response headers for a request URL. */
export function frameHeadersFor(url) {
  return isFrameablePath(url) ? FRAMEABLE_HEADERS : NOT_FRAMEABLE_HEADERS;
}

/** Vite plugin: sets the headers in `vite` (dev) and `vite preview`. */
export function frameHeadersPlugin() {
  const middleware = (req, res, next) => {
    for (const [name, value] of Object.entries(frameHeadersFor(req.originalUrl ?? req.url))) {
      res.setHeader(name, value);
    }
    next();
  };
  return {
    name: 'testimonial-frame-headers',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
