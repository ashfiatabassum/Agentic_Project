// Testimonials service (M3): public collection page (FR-05, FR-06), submission with accept
// but lock and the hard cap (FR-12, PRD §5), and the owner inbox (FR-07).
//
// Public functions take a slug and never return owner, email, plan, or count data (R7).
// Owner functions are scoped by owner_id; another owner's space is "not found" (E8).
import { getPool, withTransaction } from '../db.js';
import { HttpError, notFound, validationError } from '../lib/http.js';
import { detectImageType, removeUpload, saveImage, uploadUrl } from '../lib/uploads.js';
import { charLength, isPlainObject, Validator } from '../lib/validate.js';
import { slugProblem } from './spaces.js';

/** Saved testimonials per space, whatever the plan (data-model.md hard cap = Paid limit). */
export const HARD_CAP = 1000;
export const FULL_MESSAGE = "This page isn't accepting testimonials right now.";
export const DEFAULT_THANK_YOU = 'Thank you! Your testimonial has been sent.';
export const INBOX_FILTERS = ['all', 'favorites', 'on_wall', 'hidden', 'public'];
const EXCERPT_LENGTH = 240;

// Customer field (wire name) -> testimonial column and space mode column.
const OPTIONAL_TEXT_FIELDS = [
  { key: 'jobTitle', column: 'job_title', mode: 'job_title_mode', label: 'Job title', max: 100 },
  { key: 'company', column: 'company', mode: 'company_mode', label: 'Company', max: 100 },
];

// ---------------------------------------------------------------- public page (E21)

async function loadPublicSpace(slug, conn = getPool()) {
  // E34: only well-formed slugs reach the database (padded or non-ASCII values are "not found").
  if (slugProblem(slug)) return null;
  const [[space]] = await conn.execute(
    `SELECT id, slug, title, subtitle, prompt, thank_you_message, theme_code, brand_color, logo_path,
            job_title_mode, company_mode, social_link_mode, photo_mode, rating_mode
       FROM spaces WHERE slug = ?`,
    [slug],
  );
  if (!space) return null;
  const [questions] = await conn.execute(
    'SELECT id, question_text FROM space_questions WHERE space_id = ? AND is_active = 1 ORDER BY position, id',
    [space.id],
  );
  space.questions = questions.map((q) => ({ id: q.id, text: q.question_text }));
  return space;
}

/** Display data only: never owner, email, counts, plan, or locked information. */
export async function getPublicSpace(slug) {
  const space = await loadPublicSpace(slug);
  if (!space) throw notFound();
  return {
    slug: space.slug,
    title: space.title,
    subtitle: space.subtitle,
    prompt: space.prompt,
    themeCode: space.theme_code,
    brandColor: space.brand_color,
    logoUrl: uploadUrl(space.logo_path),
    fields: {
      jobTitle: space.job_title_mode,
      company: space.company_mode,
      socialLink: space.social_link_mode,
      photo: space.photo_mode,
      rating: space.rating_mode,
    },
    questions: space.questions,
  };
}

// ---------------------------------------------------------------- submission (E22–E24)

function socialLinkProblem(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : 'Use a link starting with http:// or https://';
  } catch {
    return 'Enter a full link, for example https://linkedin.com/in/your-name';
  }
}

/**
 * Validates a submission against the space's field settings (E23). Fields that are "off" are
 * ignored; "optional" fields are checked only when filled; "required" fields must be present.
 */
export function parseSubmission(space, data, { hasPhoto }) {
  if (!isPlainObject(data)) throw validationError({ form: 'Expected the form data as a JSON object' });
  const v = new Validator();

  const values = {
    name: v.text(data.name, 'name', { label: 'Name', max: 100, required: true }),
    email: v.email(data.email, 'email'),
    body: v.text(data.body, 'body', { label: 'Testimonial', max: 2000, required: true }),
    job_title: '',
    company: '',
    social_link: '',
    rating: null,
    consent_public: data.consentPublic === true ? 1 : 0,
    consent_social: data.consentSocial === true ? 1 : 0,
  };

  for (const f of OPTIONAL_TEXT_FIELDS) {
    if (space[f.mode] === 'off') continue;
    values[f.column] = v.text(data[f.key], f.key, { label: f.label, max: f.max, required: space[f.mode] === 'required' });
  }

  if (space.social_link_mode !== 'off') {
    const link = v.text(data.socialLink, 'socialLink', { label: 'Social link', max: 300, required: space.social_link_mode === 'required' });
    if (link && charLength(link) <= 300) {
      const problem = socialLinkProblem(link);
      if (problem) v.error('socialLink', problem);
    }
    values.social_link = link;
  }

  if (space.rating_mode !== 'off') {
    const rating = data.rating;
    if (rating === undefined || rating === null || rating === '') {
      if (space.rating_mode === 'required') v.error('rating', 'Choose a rating from 1 to 5 stars');
    } else if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      v.error('rating', 'Rating must be a whole number from 1 to 5');
    } else {
      values.rating = rating;
    }
  }

  if (space.photo_mode === 'required' && !hasPhoto) v.error('photo', 'Add a photo of yourself');

  // Answers are optional (E23); only this space's active questions are accepted.
  const answers = [];
  const rawAnswers = data.answers ?? [];
  if (!Array.isArray(rawAnswers)) {
    v.error('answers', 'Answers must be a list');
  } else {
    const byId = new Map(space.questions.map((q, i) => [q.id, { ...q, position: i + 1 }]));
    const seen = new Set();
    for (const a of rawAnswers) {
      if (!isPlainObject(a) || !byId.has(a.questionId) || seen.has(a.questionId)) {
        v.error('answers', FORM_CHANGED);
        break;
      }
      seen.add(a.questionId);
      const key = `answers.${a.questionId}`;
      const text = v.text(a.text, key, { label: 'Answer', max: 1000 });
      if (text) {
        const q = byId.get(a.questionId);
        answers.push({ question_id: q.id, question_snapshot: q.text, answer_text: text, position: q.position });
      }
    }
  }

  v.assert();
  return { values, answers };
}

const FORM_CHANGED = 'This form changed while you were filling it in. Reload the page and try again.';

/**
 * Saves a testimonial (E24, order hardened by E34). Order: find the space → validate the data →
 * only then, if the space collects photos, check the photo's type and save it (file I/O stays
 * outside the transaction) → transaction: lock the space row, count, enforce HARD_CAP, insert.
 * A photo sent to a space with photos off is ignored without being checked or written.
 * The saved file is deleted again if anything fails. Past the plan limit the testimonial is
 * still saved; it is "locked" by its rank (calculated, not stored).
 *
 * photo: the uploaded image bytes (Buffer) or null.
 */
export async function submitTestimonial(slug, { data, photo = null }) {
  const space = await loadPublicSpace(slug);
  if (!space) throw notFound();
  const collectsPhotos = space.photo_mode !== 'off';
  const usePhoto = collectsPhotos && Boolean(photo);
  const { values, answers } = parseSubmission(space, data, { hasPhoto: usePhoto });

  let photoPath = null;
  if (usePhoto) {
    const ext = detectImageType(photo);
    if (!ext) throw validationError({ photo: 'The photo must be a JPEG, PNG, or WebP image' });
    photoPath = await saveImage(photo, 'photos', ext);
  }
  values.photo_path = photoPath;

  try {
    await withTransaction(async (conn) => {
      const [[locked]] = await conn.execute('SELECT id FROM spaces WHERE id = ? FOR UPDATE', [space.id]);
      if (!locked) throw notFound(); // deleted in the meantime
      const [[{ n }]] = await conn.execute('SELECT COUNT(*) AS n FROM testimonials WHERE space_id = ?', [space.id]);
      if (Number(n) >= HARD_CAP) throw new HttpError(403, FULL_MESSAGE);
      const [result] = await conn.query('INSERT INTO testimonials SET ?', [{ ...values, space_id: space.id }]);
      for (const a of answers) {
        await conn.query('INSERT INTO testimonial_answers SET ?', [{ ...a, testimonial_id: result.insertId }]);
      }
    });
  } catch (error) {
    await removeUpload(photoPath);
    // A question removed by the owner a moment ago (E4) fails the answer's foreign key.
    if (error.code === 'ER_NO_REFERENCED_ROW_2') throw validationError({ answers: FORM_CHANGED });
    throw error;
  }
  return { thankYouMessage: space.thank_you_message || DEFAULT_THANK_YOU };
}

// ---------------------------------------------------------------- owner inbox (E28–E30)

const lockedError = (planName) =>
  new HttpError(403, `This testimonial is locked on the ${planName} plan. Upgrade to see it.`, undefined, { locked: true });

/** Owner's space with the plan limit; 404 for anyone else. */
async function ownedSpaceWithLimit(ownerId, spaceId) {
  const [[space]] = await getPool().execute(
    `SELECT s.id, s.title, s.slug, p.code AS plan_code, p.name AS plan_name, p.max_testimonials_per_space AS max_visible
       FROM spaces s
       JOIN users u ON u.id = s.owner_id
       JOIN plans p ON p.code = u.plan_code
      WHERE s.id = ? AND s.owner_id = ?`,
    [spaceId, ownerId],
  );
  if (!space) throw notFound();
  return space;
}

const FILTER_SQL = {
  all: '',
  favorites: 'AND r.is_favorite = 1',
  on_wall: 'AND r.on_wall = 1',
  hidden: 'AND r.is_hidden = 1',
  public: 'AND r.consent_public = 1',
};

/** Escapes LIKE wildcards so a search for "100%" or "a_b" matches literally. */
export const likePattern = (q) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export function parseInboxQuery(query) {
  const v = new Validator();
  const filter = v.oneOf(typeof query.filter === 'string' ? query.filter : undefined, 'filter', INBOX_FILTERS, { label: 'Filter', fallback: 'all' });
  const q = v.text(typeof query.q === 'string' ? query.q : '', 'q', { label: 'Search', max: 100 });
  v.assert();
  return { filter, q };
}

function excerpt(text) {
  const chars = [...text];
  return chars.length > EXCERPT_LENGTH ? `${chars.slice(0, EXCERPT_LENGTH).join('').trimEnd()}…` : text;
}

/**
 * Visible (unlocked) testimonials of one space, favourites first, then newest (FR-07, FR-08).
 * Visibility follows data-model.md: rank by (created_at, id) within the space; rank ≤ plan limit.
 */
export async function listTestimonials(ownerId, spaceId, { filter = 'all', q = '' } = {}) {
  const space = await ownedSpaceWithLimit(ownerId, spaceId);
  const limit = space.max_visible;
  const params = [spaceId, limit];
  let search = '';
  if (q) {
    search = 'AND (r.name LIKE ? OR r.company LIKE ? OR r.body LIKE ?)';
    const pattern = likePattern(q);
    params.push(pattern, pattern, pattern);
  }
  const pool = getPool();
  const [[rows], [[{ total }]]] = await Promise.all([
    pool.execute(
      `SELECT r.id, r.name, r.job_title, r.company, r.rating, r.body, r.photo_path, r.consent_public, r.consent_social,
              r.is_hidden, r.is_favorite, r.on_wall, r.edited_at, r.created_at
         -- Only the listed columns are materialised (mysql skill review: narrower temp table).
         FROM (SELECT t.id, t.name, t.job_title, t.company, t.rating, t.body, t.photo_path, t.consent_public,
                      t.consent_social, t.is_hidden, t.is_favorite, t.on_wall, t.edited_at, t.created_at,
                      ROW_NUMBER() OVER (ORDER BY t.created_at, t.id) AS rn
                 FROM testimonials t WHERE t.space_id = ?) r
        WHERE r.rn <= ? ${FILTER_SQL[filter]} ${search}
        ORDER BY r.is_favorite DESC, r.created_at DESC, r.id DESC`,
      params,
    ),
    pool.execute('SELECT COUNT(*) AS total FROM testimonials WHERE space_id = ?', [spaceId]),
  ]);
  const totalCount = Number(total);
  return {
    space: { id: space.id, title: space.title, slug: space.slug },
    testimonials: rows.map((r) => ({
      id: r.id,
      name: r.name,
      jobTitle: r.job_title,
      company: r.company,
      rating: r.rating,
      excerpt: excerpt(r.body),
      photoUrl: uploadUrl(r.photo_path),
      consentPublic: r.consent_public === 1,
      consentSocial: r.consent_social === 1,
      isHidden: r.is_hidden === 1,
      isFavorite: r.is_favorite === 1,
      onWall: r.on_wall === 1,
      edited: r.edited_at !== null,
      createdAt: r.created_at,
    })),
    counts: { visible: Math.min(totalCount, limit), locked: Math.max(0, totalCount - limit), total: totalCount },
    plan: { code: space.plan_code, name: space.plan_name, maxVisible: limit },
    filter,
    q,
  };
}

/** Full details of one visible testimonial (E29); a locked one returns 403 { locked: true }. */
export async function getTestimonial(ownerId, spaceId, testimonialId) {
  const space = await ownedSpaceWithLimit(ownerId, spaceId);
  const pool = getPool();
  // Rank by id only (narrow temp table), then read the one row by primary key (mysql skill review).
  const [[ranked]] = await pool.execute(
    `SELECT r.rn FROM (SELECT t.id, ROW_NUMBER() OVER (ORDER BY t.created_at, t.id) AS rn
                         FROM testimonials t WHERE t.space_id = ?) r
      WHERE r.id = ?`,
    [spaceId, testimonialId],
  );
  if (!ranked) throw notFound();
  if (Number(ranked.rn) > space.max_visible) throw lockedError(space.plan_name);
  const [[row]] = await pool.execute(
    `SELECT id, name, email, job_title, company, social_link, rating, body, original_body, photo_path,
            consent_public, consent_social, is_hidden, is_favorite, on_wall, edited_at, created_at
       FROM testimonials WHERE id = ? AND space_id = ?`,
    [testimonialId, spaceId],
  );
  if (!row) throw notFound(); // deleted in the meantime
  const [answers] = await pool.execute(
    'SELECT question_snapshot, answer_text FROM testimonial_answers WHERE testimonial_id = ? ORDER BY position, id',
    [testimonialId],
  );
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    jobTitle: row.job_title,
    company: row.company,
    socialLink: row.social_link,
    rating: row.rating,
    body: row.body,
    originalBody: row.original_body,
    photoUrl: uploadUrl(row.photo_path),
    consentPublic: row.consent_public === 1,
    consentSocial: row.consent_social === 1,
    isHidden: row.is_hidden === 1,
    isFavorite: row.is_favorite === 1,
    onWall: row.on_wall === 1,
    editedAt: row.edited_at,
    createdAt: row.created_at,
    answers: answers.map((a) => ({ question: a.question_snapshot, answer: a.answer_text })),
  };
}

// ---------------------------------------------------------------- moderation (M4: E39–E46)

/**
 * Inside a transaction: locks one testimonial row of the owner's space and checks it is visible
 * (E39, E40). Another owner's space, another space's testimonial, or an unknown id → 404; a
 * locked testimonial → 403 { locked: true }. Only the testimonial row is locked (never the
 * user or space row), so the user → space lock order (data-model.md) is kept.
 */
async function lockVisibleTestimonial(conn, ownerId, spaceId, testimonialId) {
  const [[row]] = await conn.execute(
    `SELECT t.id, t.name, t.job_title, t.company, t.social_link, t.rating, t.body, t.original_body, t.photo_path,
            t.consent_public, t.is_hidden, t.is_favorite, t.on_wall,
            p.name AS plan_name, p.max_testimonials_per_space AS max_visible
       FROM testimonials t
       JOIN spaces s ON s.id = t.space_id
       JOIN users u ON u.id = s.owner_id
       JOIN plans p ON p.code = u.plan_code
      WHERE t.id = ? AND t.space_id = ? AND s.owner_id = ?
        FOR UPDATE OF t`,
    [testimonialId, spaceId, ownerId],
  );
  if (!row) throw notFound();
  // Snapshot (non-locking) rank read after the locking read: safe only because a rank can only
  // fall (deletes) and the limit only rise (upgrade). If a plan downgrade or moving testimonials
  // between spaces is ever added, re-check this (data-model.md → "Moderation (M4)").
  const [[ranked]] = await conn.execute(
    `SELECT r.rn FROM (SELECT t.id, ROW_NUMBER() OVER (ORDER BY t.created_at, t.id) AS rn
                         FROM testimonials t WHERE t.space_id = ?) r
      WHERE r.id = ?`,
    [spaceId, testimonialId],
  );
  if (!ranked || Number(ranked.rn) > row.max_visible) throw lockedError(row.plan_name);
  return row;
}

const FLAG_KEYS = ['favorite', 'hidden', 'onWall'];
export const NO_PUBLIC_CONSENT = 'The customer did not agree to public display, so it cannot go on the Wall of Love.';
export const UNHIDE_FIRST = 'Hidden testimonials cannot go on the Wall of Love. Unhide it first.';

/** E41: any of { favorite, hidden, onWall }, booleans only, at least one. */
export function parseFlags(body) {
  if (!isPlainObject(body)) throw validationError({ form: 'Expected a JSON object' });
  const v = new Validator();
  const keys = Object.keys(body);
  if (keys.length === 0) v.error('form', 'Send at least one of: favorite, hidden, onWall');
  for (const key of keys) {
    if (!FLAG_KEYS.includes(key)) v.error(key, `${key} cannot be changed here`);
    else if (typeof body[key] !== 'boolean') v.error(key, `${key} must be true or false`);
  }
  v.assert();
  return { favorite: body.favorite, hidden: body.hidden, onWall: body.onWall };
}

/**
 * E41–E43: favourite, hide/unhide, wall on/off. Hiding also takes it off the wall (the DB CHECK
 * requires it); unhiding does not put it back. The wall needs public consent and not hidden (409).
 */
export async function updateFlags(ownerId, spaceId, testimonialId, flags) {
  await withTransaction(async (conn) => {
    const row = await lockVisibleTestimonial(conn, ownerId, spaceId, testimonialId);
    const favorite = flags.favorite ?? row.is_favorite === 1;
    const hidden = flags.hidden ?? row.is_hidden === 1;
    let onWall = flags.onWall ?? row.on_wall === 1;
    if (hidden) {
      if (flags.onWall === true) throw new HttpError(409, UNHIDE_FIRST);
      onWall = false;
    }
    if (onWall && row.consent_public !== 1) throw new HttpError(409, NO_PUBLIC_CONSENT);
    await conn.execute(
      'UPDATE testimonials SET is_favorite = ?, is_hidden = ?, on_wall = ? WHERE id = ?',
      [favorite ? 1 : 0, hidden ? 1 : 0, onWall ? 1 : 0, testimonialId],
    );
  });
  // Re-read after commit (accepted, code review): if another tab deletes the row in between, the
  // owner sees 404 although this change was saved — harmless, the row is gone either way.
  return getTestimonial(ownerId, spaceId, testimonialId);
}

const CONTENT_KEYS = ['name', 'jobTitle', 'company', 'socialLink', 'rating', 'body', 'removePhoto'];
const ONLY_THE_CUSTOMER = 'Only the customer can give or withdraw consent';
const NOT_EDITABLE = {
  email: "The customer's email cannot be changed",
  consentPublic: ONLY_THE_CUSTOMER,
  consentSocial: ONLY_THE_CUSTOMER,
};

/**
 * E44: the owner may edit name, job title, company, social link, rating, and text (same limits as
 * the public form, whatever the space's field modes) and remove the photo. Email, consents,
 * answers, and dates are never editable: sending them is a 400, not silently ignored.
 */
export function parseContent(body) {
  if (!isPlainObject(body)) throw validationError({ form: 'Expected a JSON object' });
  const v = new Validator();
  for (const key of Object.keys(body)) {
    if (!CONTENT_KEYS.includes(key)) v.error(key, NOT_EDITABLE[key] ?? `${key} cannot be edited`);
  }
  const values = {
    name: v.text(body.name, 'name', { label: 'Name', max: 100, required: true }),
    job_title: v.text(body.jobTitle, 'jobTitle', { label: 'Job title', max: 100 }),
    company: v.text(body.company, 'company', { label: 'Company', max: 100 }),
    social_link: v.text(body.socialLink, 'socialLink', { label: 'Social link', max: 300 }),
    rating: null,
    body: v.text(body.body, 'body', { label: 'Testimonial', max: 2000, required: true }),
  };
  if (values.social_link && charLength(values.social_link) <= 300) {
    const problem = socialLinkProblem(values.social_link);
    if (problem) v.error('socialLink', problem);
  }
  const { rating } = body;
  if (rating !== undefined && rating !== null && rating !== '') {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) v.error('rating', 'Rating must be a whole number from 1 to 5, or empty');
    else values.rating = rating;
  }
  if (body.removePhoto !== undefined && typeof body.removePhoto !== 'boolean') v.error('removePhoto', 'removePhoto must be true or false');
  v.assert();
  return { values, removePhoto: body.removePhoto === true };
}

/**
 * E44–E45: saves the edit. Only a real change sets edited_at; the first change of the text keeps
 * the customer's words in original_body. A removed photo's file is deleted after commit.
 */
export async function updateContent(ownerId, spaceId, testimonialId, { values, removePhoto }) {
  const oldPhoto = await withTransaction(async (conn) => {
    const row = await lockVisibleTestimonial(conn, ownerId, spaceId, testimonialId);
    const changes = {};
    for (const [column, value] of Object.entries(values)) {
      if (row[column] !== value) changes[column] = value;
    }
    const dropPhoto = removePhoto && row.photo_path !== null;
    if (dropPhoto) changes.photo_path = null;
    if (Object.keys(changes).length === 0) return null;
    if ('body' in changes && row.original_body === null) changes.original_body = row.body;
    await conn.query('UPDATE testimonials SET ?, edited_at = UTC_TIMESTAMP() WHERE id = ?', [changes, testimonialId]);
    return dropPhoto ? row.photo_path : null;
  });
  await removeUpload(oldPhoto); // file I/O only after commit (data-model.md)
  return getTestimonial(ownerId, spaceId, testimonialId);
}

/** E46: deletes a visible testimonial (answers cascade); its photo file is removed after commit. */
export async function deleteTestimonial(ownerId, spaceId, testimonialId) {
  const photoPath = await withTransaction(async (conn) => {
    const row = await lockVisibleTestimonial(conn, ownerId, spaceId, testimonialId);
    await conn.execute('DELETE FROM testimonials WHERE id = ?', [testimonialId]);
    return row.photo_path;
  });
  await removeUpload(photoPath);
}

// ---------------------------------------------------------------- public Wall of Love (E48)

/**
 * Wall testimonials of one space: on the wall, not hidden, public consent, and not locked.
 * Columns are listed explicitly; never email, social link, consents, original text, answers,
 * ids, counts, owner, or plan (data-model.md R7). Newest first.
 */
export async function getPublicWall(slug) {
  if (slugProblem(slug)) throw notFound();
  const pool = getPool();
  const [[space]] = await pool.execute(
    `SELECT s.id, s.slug, s.title, s.subtitle, s.theme_code, s.brand_color, s.logo_path,
            p.max_testimonials_per_space AS max_visible
       FROM spaces s
       JOIN users u ON u.id = s.owner_id
       JOIN plans p ON p.code = u.plan_code
      WHERE s.slug = ?`,
    [slug],
  );
  if (!space) throw notFound();
  // Rank ids only (narrow temp table), then read the eligible rows by primary key.
  const [rows] = await pool.execute(
    `SELECT t.name, t.job_title, t.company, t.photo_path, t.rating, t.body, t.edited_at, t.created_at
       FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
               FROM testimonials WHERE space_id = ?) r
       JOIN testimonials t ON t.id = r.id
      WHERE r.rn <= ? AND t.on_wall = 1 AND t.is_hidden = 0 AND t.consent_public = 1
      ORDER BY t.created_at DESC, t.id DESC`,
    [space.id, space.max_visible],
  );
  return {
    space: {
      slug: space.slug,
      title: space.title,
      subtitle: space.subtitle,
      themeCode: space.theme_code,
      brandColor: space.brand_color,
      logoUrl: uploadUrl(space.logo_path),
    },
    testimonials: rows.map((r) => ({
      name: r.name,
      jobTitle: r.job_title,
      company: r.company,
      photoUrl: uploadUrl(r.photo_path),
      rating: r.rating,
      body: r.body,
      edited: r.edited_at !== null,
      createdAt: r.created_at,
    })),
  };
}
