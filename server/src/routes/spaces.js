// Owner space API (E8). Every route requires a session; every query is owner-scoped in the
// service, and another owner's space returns 404.
import { Router } from 'express';
import multer from 'multer';
import { HttpError, parseId, validationError } from '../lib/http.js';
import { detectImageType, MAX_IMAGE_BYTES, removeUpload, saveImage, uploadUrl } from '../lib/uploads.js';
import { requireAuth } from '../middleware/auth.js';
import {
  assertOwnsSpace, createSpace, deleteSpace, getSpace, listSpaces, parseSpaceInput, replaceLogo, slugAvailability, updateSpace,
} from '../services/spaces.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  res.json(await listSpaces(req.user.id));
});

// GET /api/spaces/slug-available?slug=acme&spaceId=12 (spaceId: the space being edited, optional)
router.get('/slug-available', async (req, res) => {
  const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
  const spaceId = typeof req.query.spaceId === 'string' && /^[1-9][0-9]{0,15}$/.test(req.query.spaceId)
    ? Number(req.query.spaceId)
    : null;
  res.json(await slugAvailability(req.user.id, slug, spaceId));
});

router.post('/', async (req, res) => {
  const input = await parseSpaceInput(req.body);
  const id = await createSpace(req.user.id, input);
  res.status(201).json({ space: await getSpace(req.user.id, id) });
});

router.get('/:id', async (req, res) => {
  res.json({ space: await getSpace(req.user.id, parseId(req.params.id)) });
});

router.put('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  await assertOwnsSpace(req.user.id, id); // 404 before validation, so nothing about other owners' spaces leaks
  await updateSpace(req.user.id, id, await parseSpaceInput(req.body));
  res.json({ space: await getSpace(req.user.id, id) });
});

router.delete('/:id', async (req, res) => {
  await deleteSpace(req.user.id, parseId(req.params.id));
  res.status(204).end();
});

// ---------------------------------------------------------------- logo (E7)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0, parts: 1 },
}).single('logo');

function readLogo(req, res, next) {
  upload(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'The logo must be 2 MB or smaller'
        : 'Upload a single image in the "logo" field';
      return next(validationError({ logo: message }));
    }
    return next(error);
  });
}

// The upload is multipart (allowed by jsonOnly only for this route), so it also requires a
// custom header: cross-site pages cannot send one without a CORS preflight, which is never allowed.
async function requireUploadHeader(req, res, next) {
  if (req.get('X-Requested-With') !== 'fetch') throw new HttpError(403, 'Missing X-Requested-With header');
  next();
}

async function checkOwnerBeforeUpload(req, res, next) {
  req.spaceId = parseId(req.params.id);
  await assertOwnsSpace(req.user.id, req.spaceId);
  next();
}

router.post('/:id/logo', requireUploadHeader, checkOwnerBeforeUpload, readLogo, async (req, res) => {
  const ext = detectImageType(req.file?.buffer);
  if (!req.file) throw validationError({ logo: 'Choose an image to upload' });
  if (!ext) throw validationError({ logo: 'The logo must be a JPEG, PNG, or WebP image' });

  // File I/O stays outside the transaction (D10): save first, delete it again if the update fails.
  const newPath = await saveImage(req.file.buffer, 'logos', ext);
  let oldPath;
  try {
    oldPath = await replaceLogo(req.user.id, req.spaceId, newPath);
  } catch (error) {
    await removeUpload(newPath);
    throw error;
  }
  await removeUpload(oldPath);
  res.json({ logoUrl: uploadUrl(newPath) });
});

router.delete('/:id/logo', async (req, res) => {
  const oldPath = await replaceLogo(req.user.id, parseId(req.params.id), null);
  await removeUpload(oldPath);
  res.status(204).end();
});

export default router;
