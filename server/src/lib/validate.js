// Small validation helper. Collects one message per field, then throws a 400
// { error: 'Validation failed', fields } via assert(). Lengths count Unicode code points,
// matching MySQL VARCHAR(n) limits.
import { validationError } from './http.js';

export const charLength = (value) => [...value].length;

// Deliberately simple: something@something.tld, no spaces (PRD §10 Q5).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export class Validator {
  constructor() {
    this.fields = {};
  }

  error(key, message) {
    if (!(key in this.fields)) this.fields[key] = message;
  }

  get ok() {
    return Object.keys(this.fields).length === 0;
  }

  assert() {
    if (!this.ok) throw validationError(this.fields);
  }

  /** Trimmed text. Missing values become ''. */
  text(value, key, { label, max, required = false }) {
    if (value === undefined || value === null) value = '';
    if (typeof value !== 'string') {
      this.error(key, `${label} must be text`);
      return '';
    }
    const trimmed = value.trim();
    if (required && !trimmed) this.error(key, `${label} is required`);
    else if (charLength(trimmed) > max) this.error(key, `${label} must be at most ${max} characters`);
    return trimmed;
  }

  /** Trimmed, lowercased email address. */
  email(value, key = 'email') {
    const email = this.text(value, key, { label: 'Email', max: 254, required: true }).toLowerCase();
    if (email && charLength(email) <= 254 && !EMAIL_RE.test(email)) this.error(key, 'Enter a valid email address');
    return email;
  }

  oneOf(value, key, allowed, { label, fallback }) {
    if ((value === undefined || value === null) && fallback !== undefined) return fallback;
    if (!allowed.includes(value)) {
      this.error(key, `${label} must be one of: ${allowed.join(', ')}`);
      return fallback ?? allowed[0];
    }
    return value;
  }
}
