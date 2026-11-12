// M5 embed (plan.md E68–E70). The embed page reads the existing public wall API, whose
// eligibility and private-data rules are covered in moderation.test.js. These tests cover what
// M5 adds: which pages may be framed, the whitelisted URL settings, the snippet, and the API's
// X-Frame-Options header. The client modules are plain JS, so they are imported directly.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createApp } from '../src/app.js';
import { closePool } from '../src/db.js';
import { frameHeadersFor, frameHeadersPlugin, isFrameablePath } from '../../client/frameHeaders.js';
import {
  defaultSettings, embedPath, embedSnippet, escapeHtml, parseBackground, parseEmbedSettings, readResizeMessage,
} from '../../client/src/embed/embedSettings.js';

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closePool();
});

test('only /embed/:slug may be framed (E68)', () => {
  for (const url of ['/embed/acme', '/embed/acme/', '/embed/acme?layout=grid&mode=dark', '/embed/acme#x', '/Embed/acme']) {
    assert.equal(isFrameablePath(url), true, url);
    assert.deepEqual(frameHeadersFor(url), { 'Content-Security-Policy': 'frame-ancestors *' }, url);
  }
  const blocked = ['/', '/login', '/signup', '/dashboard', '/spaces/1/embed', '/spaces/1/inbox', '/s/acme',
    '/s/acme/wall', '/embed', '/embed/', '/embed/a/b', '/embedx/acme', '//embed/acme', '/api/embed/acme',
    '/x/embed/acme', '/s/acme?next=/embed/acme', '/embed/a%2Fb/../../login'.replace('%2F', '/'), '', undefined];
  for (const url of blocked) {
    assert.equal(isFrameablePath(url), false, String(url));
    assert.deepEqual(frameHeadersFor(url), {
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "frame-ancestors 'none'",
    }, String(url));
  }
});

test('API responses carry X-Frame-Options: DENY (E68)', async () => {
  for (const path of ['/api/health', '/api/auth/me', '/api/public/spaces/no-such-space/wall']) {
    const res = await fetch(`${baseUrl}${path}`);
    assert.equal(res.headers.get('x-frame-options'), 'DENY', path);
  }
});

test('settings parser accepts every whitelisted value (E61)', () => {
  for (const layout of ['grid', 'list', 'carousel']) {
    assert.equal(parseEmbedSettings(`layout=${layout}`).layout, layout);
  }
  assert.equal(parseEmbedSettings('mode=dark').mode, 'dark');
  assert.equal(parseEmbedSettings('mode=light', 'dark').mode, 'light');
  assert.equal(parseEmbedSettings('animate=0').animate, false);
  assert.equal(parseEmbedSettings('animate=1').animate, true);
  assert.equal(parseEmbedSettings('header=0').header, false);
  assert.equal(parseEmbedSettings('header=1').header, true);
  assert.equal(parseEmbedSettings('header=no').header, true);
  assert.equal(parseEmbedSettings('bg=ffaa00').bg, '#FFAA00');
  assert.equal(parseEmbedSettings('bg=%23ffaa00').bg, '#FFAA00');
  assert.equal(parseEmbedSettings('bg=TRANSPARENT').bg, 'transparent');
  // Case and surrounding spaces in layout/mode are tolerated.
  assert.equal(parseEmbedSettings('layout=Carousel&mode=DARK').layout, 'carousel');
  assert.equal(parseEmbedSettings(new URLSearchParams({ mode: ' Dark ' })).mode, 'dark');
});

test('unknown or missing settings fall back to the defaults (E61)', () => {
  assert.deepEqual(parseEmbedSettings(''), { layout: 'grid', mode: 'light', bg: null, header: true, animate: true });
  assert.deepEqual(parseEmbedSettings('', 'dark'), { layout: 'grid', mode: 'dark', bg: null, header: true, animate: true });
  assert.deepEqual(parseEmbedSettings('', 'warm'), defaultSettings('warm'));
  assert.equal(defaultSettings('warm').mode, 'light');
  const bad = parseEmbedSettings('layout=masonry&mode=sepia&animate=yes&bg=red');
  assert.deepEqual(bad, { layout: 'grid', mode: 'light', bg: null, header: true, animate: true });
  // A value is never passed through unchecked: CSS injection attempts are rejected.
  for (const bg of ['fff', 'fffffff', 'gggggg', '#12345', 'ff0000;background:url(x)', 'url(javascript:x)', '']) {
    assert.equal(parseBackground(bg), null, bg);
  }
  assert.equal(parseBackground(undefined), null);
  // Repeated parameters: the first value wins, and it is still whitelisted.
  assert.equal(parseEmbedSettings('layout=evil&layout=list').layout, 'grid');
});

test('embedPath builds a URL with only whitelisted parameters (E61)', () => {
  assert.equal(
    embedPath('acme-bakery', { layout: 'carousel', mode: 'dark', bg: '#0f172a', animate: false }),
    '/embed/acme-bakery?layout=carousel&mode=dark&bg=0F172A&header=1&animate=0',
  );
  assert.equal(embedPath('acme', { layout: 'list', mode: 'light', bg: null, animate: true }), '/embed/acme?layout=list&mode=light&header=1&animate=1');
  assert.equal(embedPath('acme', { header: false }), '/embed/acme?layout=grid&mode=light&header=0&animate=1');
  assert.equal(embedPath('acme', { layout: 'grid', mode: 'light', bg: 'transparent', animate: true }), '/embed/acme?layout=grid&mode=light&bg=transparent&header=1&animate=1');
  // Junk settings never reach the URL.
  const junk = embedPath('acme', { layout: '"><script>', mode: 'x', bg: 'url(x)', animate: 'maybe', extra: 'y' });
  assert.equal(junk, '/embed/acme?layout=grid&mode=light&header=1&animate=1');
  // The slug is encoded as one path segment.
  assert.equal(embedPath('a/b?c', {}).startsWith('/embed/a%2Fb%3Fc?'), true);
});

test('snippet is a full-width sandboxed iframe with escaped values and a guarded resize script (E64, E65, E69)', () => {
  const code = embedSnippet({
    origin: 'http://localhost:5174',
    slug: 'acme',
    title: 'Tom & "Jerry\'s" <Bakery>',
    settings: { layout: 'grid', mode: 'dark', bg: null, header: true, animate: true },
  });
  assert.match(code, /<iframe data-testimonial-mvp src="http:\/\/localhost:5174\/embed\/acme\?layout=grid&amp;mode=dark&amp;header=1&amp;animate=1"/);
  assert.match(code, /referrerpolicy="strict-origin-when-cross-origin"/);
  assert.match(code, /title="Testimonials for Tom &amp; &quot;Jerry&#39;s&quot; &lt;Bakery&gt;"/);
  assert.ok(!code.includes('<Bakery>'));
  assert.match(code, /style="width:100%;height:480px;border:0;"/);
  assert.match(code, /loading="lazy"/);
  assert.match(code, /sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"/);
  assert.ok(!/allow-top-navigation|allow-forms/.test(code));
  // The script trusts only the embed origin, only its own iframes, and only a sane height.
  assert.match(code, /var origin = "http:\/\/localhost:5174";/);
  assert.match(code, /e\.origin !== origin/);
  assert.match(code, /contentWindow === e\.source/);
  // An origin can never close the <script> element.
  const odd = embedSnippet({ origin: 'http://x</script><b>', slug: 'acme', title: 'A', settings: {} });
  assert.equal(odd.match(/<\/script>/g).length, 1);
  assert.equal(escapeHtml(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;');
});

test('resize messages: valid ones are clamped to 50–10,000 px, others ignored (E65)', () => {
  assert.equal(readResizeMessage({ type: 'testimonial-mvp:resize', height: 640.2 }), 641);
  assert.equal(readResizeMessage({ type: 'testimonial-mvp:resize', height: 20 }), 50);
  assert.equal(readResizeMessage({ type: 'testimonial-mvp:resize', height: 25000 }), 10000);
  for (const data of [null, 'x', { type: 'other', height: 500 }, { type: 'testimonial-mvp:resize', height: 'abc' },
    { type: 'testimonial-mvp:resize', height: Infinity }, { type: 'testimonial-mvp:resize' }]) {
    assert.equal(readResizeMessage(data), null, JSON.stringify(data));
  }
});

/** Runs the snippet's <script> in a sandbox with fake frames; returns a function to deliver messages. */
function runSnippetScript(origin) {
  const code = embedSnippet({ origin, slug: 'acme', title: 'Acme', settings: {} });
  const script = code.slice(code.indexOf('<script>') + 8, code.indexOf('</script>'));
  const ours = { contentWindow: { name: 'embed' }, style: { height: '480px' } };
  const other = { contentWindow: { name: 'other' }, style: { height: '480px' } };
  let listener;
  const window = { addEventListener: (type, fn) => { assert.equal(type, 'message'); listener = fn; } };
  const document = { querySelectorAll: (sel) => { assert.equal(sel, 'iframe[data-testimonial-mvp]'); return [ours]; } };
  vm.runInNewContext(script, { window, document, Number, Math, isFinite });
  return { send: (event) => listener(event), ours, other };
}

test('the snippet script resizes only its own iframe, only from the embed origin (E65, executed)', () => {
  const { send, ours, other } = runSnippetScript('http://localhost:5174');
  const good = { origin: 'http://localhost:5174', source: ours.contentWindow, data: { type: 'testimonial-mvp:resize', height: 612.4 } };
  send({ ...good, origin: 'https://evil.example' });
  send({ ...good, source: other.contentWindow });
  send({ ...good, data: { type: 'other', height: 700 } });
  send({ ...good, data: { type: 'testimonial-mvp:resize', height: 'abc' } });
  send({ ...good, data: null });
  assert.equal(ours.style.height, '480px', 'nothing above may change the height');
  send(good);
  assert.equal(ours.style.height, '613px');
  send({ ...good, data: { type: 'testimonial-mvp:resize', height: 1e9 } });
  assert.equal(ours.style.height, '10000px');
  send({ ...good, data: { type: 'testimonial-mvp:resize', height: 3 } });
  assert.equal(ours.style.height, '50px');
});

test('the Vite plugin sets the frame headers on dev and preview responses (E68)', () => {
  const plugin = frameHeadersPlugin();
  for (const hook of ['configureServer', 'configurePreviewServer']) {
    let middleware;
    plugin[hook]({ middlewares: { use: (fn) => { middleware = fn; } } });
    const call = (req) => {
      const headers = {};
      let nextCalled = false;
      middleware(req, { setHeader: (k, v) => { headers[k] = v; } }, () => { nextCalled = true; });
      assert.equal(nextCalled, true);
      return headers;
    };
    assert.deepEqual(call({ url: '/embed/acme?layout=grid' }), { 'Content-Security-Policy': 'frame-ancestors *' }, hook);
    assert.deepEqual(call({ url: '/login' }), { 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "frame-ancestors 'none'" }, hook);
    // originalUrl (the full path) wins over a rewritten req.url.
    assert.equal(call({ originalUrl: '/dashboard', url: '/embed/acme' })['X-Frame-Options'], 'DENY', hook);
  }
});
