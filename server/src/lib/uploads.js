// Image uploads (data-model.md D9): JPEG, PNG, or WebP up to 2 MB, type detected from the
// file's bytes (never its name or the browser's MIME type), saved under a random name.
// Only the relative path (for example "logos/<32 hex>.png") is stored in the database.
import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
const STORED_PATH_RE = /^(logos|photos)\/[a-f0-9]{32}\.(jpg|png|webp)$/;

/** Upload root; UPLOADS_DIR lets tests use a temporary folder. Read lazily so tests can set it. */
export function uploadsRoot() {
  return process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : DEFAULT_ROOT;
}

export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/** Writes an already type-checked image and returns its stored relative path. */
export async function saveImage(buffer, kind, ext) {
  const dir = path.join(uploadsRoot(), kind);
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(16).toString('hex')}.${ext}`;
  await writeFile(path.join(dir, name), buffer, { flag: 'wx' });
  return `${kind}/${name}`;
}

/** Deletes a stored upload. Ignores empty or malformed paths and files that are already gone. */
export async function removeUpload(storedPath) {
  if (typeof storedPath !== 'string' || !STORED_PATH_RE.test(storedPath)) return;
  try {
    await unlink(path.join(uploadsRoot(), ...storedPath.split('/')));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error(`Could not delete upload ${storedPath}:`, error.message);
  }
}

export const uploadUrl = (storedPath) => (storedPath ? `/uploads/${storedPath}` : null);
