// Minimal cookie parsing and serialisation (E11: no cookie library).

export function parseCookies(header) {
  const cookies = {};
  if (typeof header !== 'string') return cookies;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (!name || name in cookies) continue; // first occurrence wins
    let value = part.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

/** Builds a Set-Cookie value. `maxAge` is in seconds; 0 deletes the cookie. */
export function serializeCookie(name, value, { maxAge, secure = false } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
