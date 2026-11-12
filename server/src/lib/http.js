// One error format for the whole API (PRD §10): { error, fields? }.
// Throw an HttpError from any route; the central error handler in app.js turns it into JSON.

export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    if (fields) this.fields = fields;
  }
}

export const validationError = (fields) => new HttpError(400, 'Validation failed', fields);
export const notFound = () => new HttpError(404, 'Not found');
export const notSignedIn = () => new HttpError(401, 'Not signed in');

/** Parses a positive integer id from a URL parameter; anything else is treated as "not found". */
export function parseId(value) {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,15}$/.test(value)) throw notFound();
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw notFound();
  return id;
}
