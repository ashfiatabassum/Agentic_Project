// HTTP helpers for API tests: start the app on a random port and talk to it with a tiny
// cookie-keeping client (one Client = one browser).
import { createApp } from '../../src/app.js';
import { assertTestDatabase, unique } from './db.js';

export async function startServer(options) {
  assertTestDatabase();
  const server = createApp(options).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  get cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  /** JSON request by default; pass { raw: { body, headers } } for anything else. */
  async request(method, path, { json, raw, headers = {} } = {}) {
    const init = { method, headers: { ...headers } };
    if (this.cookies.size) init.headers.cookie = this.cookieHeader;
    if (raw) {
      Object.assign(init.headers, raw.headers);
      init.body = raw.body;
    } else if (method !== 'GET') {
      init.headers['content-type'] = 'application/json';
      if (json !== undefined) init.body = JSON.stringify(json);
    }
    const res = await fetch(this.baseUrl + path, init);
    for (const line of res.headers.getSetCookie()) {
      const [pair, ...attrs] = line.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expired = attrs.some((a) => /^\s*max-age=0\s*$/i.test(a));
      if (expired || value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: res.status, body, headers: res.headers, setCookies: res.headers.getSetCookie() };
  }

  get(path, opts) { return this.request('GET', path, opts); }
  post(path, json, opts) { return this.request('POST', path, { json, ...opts }); }
  put(path, json, opts) { return this.request('PUT', path, { json, ...opts }); }
  delete(path, opts) { return this.request('DELETE', path, opts); }
}

/** Registers a fresh owner and returns a signed-in client plus the user. */
export async function signedInOwner(baseUrl, overrides = {}) {
  const client = new Client(baseUrl);
  const credentials = { name: 'Owner', email: `${unique('owner')}@example.com`, password: 'correct-horse', ...overrides };
  const res = await client.post('/api/auth/register', credentials);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { client, user: res.body.user, credentials };
}

export const validSpace = (overrides = {}) => ({
  title: 'Acme Bakery',
  subtitle: 'Fresh bread',
  prompt: 'How was it?',
  thankYouMessage: '',
  slug: unique('acme').toLowerCase(),
  themeCode: 'light',
  brandColor: '#4f46e5',
  fields: { jobTitle: 'optional', company: 'off', socialLink: 'off', photo: 'off', rating: 'required' },
  questions: [{ text: 'What did you buy?' }, { text: 'Would you recommend us?' }],
  ...overrides,
});
