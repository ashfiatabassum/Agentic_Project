// One fetch helper for the whole client (E12): JSON in and out, one error shape,
// and a 401 mid-session hands control to AuthContext (which redirects to /login?next=…).

export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

/**
 * api('/spaces') -> parsed JSON (or null for 204).
 * Options: method, body (sent as JSON), form (FormData upload), signal.
 */
export async function api(path, { method = 'GET', body, form, signal } = {}) {
  const headers = {};
  let payload;
  if (form) {
    payload = form;
    headers['X-Requested-With'] = 'fetch'; // required by the server for multipart uploads
  } else if (method !== 'GET') {
    headers['Content-Type'] = 'application/json'; // the server rejects other content types (415)
    if (body !== undefined) payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload, credentials: 'same-origin', signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.();
    throw new ApiError(res.status, data?.error ?? `Request failed (HTTP ${res.status})`, data?.fields ?? {});
  }
  return data;
}

/** Only same-site paths are allowed as a post-login destination (PRD §10 Q12). */
export function safeNextPath(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  if (/^\/(login|signup)(\/|\?|$)/.test(next)) return null;
  return next;
}
