// Spaces service (FR-02 – FR-04, FR-12 space limit). Every query is scoped by owner_id
// (data-model.md R7); another owner's space is reported as "not found" (E8).
import { getPool, withTransaction } from '../db.js';
import { HttpError, notFound, validationError } from '../lib/http.js';
import { isPlainObject, Validator } from '../lib/validate.js';
import { removeUpload, uploadUrl } from '../lib/uploads.js';

export const FIELD_MODES = ['off', 'optional', 'required'];
export const MAX_QUESTIONS = 5;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

// Wire name -> column name for the configurable customer fields (FR-03).
const FIELD_COLUMNS = {
  jobTitle: 'job_title_mode',
  company: 'company_mode',
  socialLink: 'social_link_mode',
  photo: 'photo_mode',
  rating: 'rating_mode',
};

const SLUG_TAKEN = 'This link is already taken';

// ---------------------------------------------------------------- themes (lookup data)

let themesPromise;
export function listThemes() {
  themesPromise ??= getPool()
    .execute('SELECT code, name FROM themes ORDER BY sort_order')
    .then(([rows]) => rows.map(({ code, name }) => ({ code, name })))
    .catch((error) => {
      themesPromise = undefined; // do not cache a failure
      throw error;
    });
  return themesPromise;
}

// ---------------------------------------------------------------- validation

export function slugProblem(slug) {
  if (typeof slug !== 'string' || slug.length < 3 || slug.length > 60 || !SLUG_RE.test(slug)) {
    return 'Use 3–60 lowercase letters, numbers, and single hyphens (for example acme-bakery)';
  }
  return null;
}

/** Validates a full create/update body and returns column values plus the question list. */
export async function parseSpaceInput(body) {
  if (!isPlainObject(body)) throw validationError({ body: 'Expected a JSON object' });
  const v = new Validator();

  const values = {
    title: v.text(body.title, 'title', { label: 'Name', max: 100, required: true }),
    subtitle: v.text(body.subtitle, 'subtitle', { label: 'Subtitle', max: 200 }),
    prompt: v.text(body.prompt, 'prompt', { label: 'Collection prompt', max: 500, required: true }),
    thank_you_message: v.text(body.thankYouMessage, 'thankYouMessage', { label: 'Thank-you message', max: 500 }),
  };

  const slugError = slugProblem(body.slug);
  if (slugError) v.error('slug', slugError);
  values.slug = slugError ? '' : body.slug;

  const themeCodes = (await listThemes()).map((t) => t.code);
  values.theme_code = v.oneOf(body.themeCode, 'themeCode', themeCodes, { label: 'Theme' });

  if (typeof body.brandColor !== 'string' || !COLOR_RE.test(body.brandColor)) {
    v.error('brandColor', 'Brand colour must be a hex colour such as #4F46E5');
  } else {
    values.brand_color = body.brandColor.toUpperCase();
  }

  const fields = isPlainObject(body.fields) ? body.fields : {};
  if (body.fields !== undefined && !isPlainObject(body.fields)) v.error('fields', 'Customer fields must be an object');
  for (const [key, column] of Object.entries(FIELD_COLUMNS)) {
    values[column] = v.oneOf(fields[key], `fields.${key}`, FIELD_MODES, { label: 'Field setting', fallback: 'off' });
  }

  const questions = [];
  const rawQuestions = body.questions ?? [];
  if (!Array.isArray(rawQuestions)) {
    v.error('questions', 'Questions must be a list');
  } else if (rawQuestions.length > MAX_QUESTIONS) {
    v.error('questions', `At most ${MAX_QUESTIONS} questions`);
  } else {
    const seen = new Set();
    rawQuestions.forEach((q, i) => {
      const key = `questions.${i}`;
      if (!isPlainObject(q)) {
        v.error(key, 'Invalid question');
        return;
      }
      const text = v.text(q.text, key, { label: 'Question', max: 200, required: true });
      let id = null;
      if (q.id !== undefined && q.id !== null) {
        if (!Number.isSafeInteger(q.id) || q.id < 1 || seen.has(q.id)) v.error(key, 'Invalid question');
        else id = q.id;
        seen.add(q.id);
      }
      questions.push({ id, text });
    });
  }

  v.assert();
  return { values, questions };
}

// ---------------------------------------------------------------- reads

function toSpace(row, questions, testimonialCount) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    prompt: row.prompt,
    thankYouMessage: row.thank_you_message,
    themeCode: row.theme_code,
    brandColor: row.brand_color,
    logoUrl: uploadUrl(row.logo_path),
    fields: Object.fromEntries(Object.entries(FIELD_COLUMNS).map(([key, column]) => [key, row[column]])),
    questions,
    testimonialCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Dashboard list: my spaces (newest first) with testimonial counts, plus space usage. */
export async function listSpaces(ownerId) {
  const pool = getPool();
  const [[spaces], [[plan]]] = await Promise.all([
    pool.execute(
      `SELECT s.id, s.slug, s.title, s.theme_code, s.brand_color, s.logo_path, s.created_at,
              (SELECT COUNT(*) FROM testimonials t WHERE t.space_id = s.id) AS testimonial_count
         FROM spaces s
        WHERE s.owner_id = ?
        ORDER BY s.created_at DESC, s.id DESC`,
      [ownerId],
    ),
    pool.execute(
      'SELECT p.code, p.name, p.max_spaces, p.max_testimonials_per_space FROM users u JOIN plans p ON p.code = u.plan_code WHERE u.id = ?',
      [ownerId],
    ),
  ]);
  return {
    spaces: spaces.map((s) => {
      const count = Number(s.testimonial_count);
      return {
        id: s.id,
        slug: s.slug,
        title: s.title,
        themeCode: s.theme_code,
        brandColor: s.brand_color,
        logoUrl: uploadUrl(s.logo_path),
        testimonialCount: count,
        lockedCount: Math.max(0, count - plan.max_testimonials_per_space), // E31 (accept but lock)
        createdAt: s.created_at,
      };
    }),
    usage: { plan: plan.code, planName: plan.name, spacesUsed: spaces.length, spacesMax: plan.max_spaces },
  };
}

export async function getSpace(ownerId, spaceId) {
  const pool = getPool();
  const [[row]] = await pool.execute(
    `SELECT id, slug, title, subtitle, prompt, thank_you_message, theme_code, brand_color, logo_path,
            job_title_mode, company_mode, social_link_mode, photo_mode, rating_mode, created_at, updated_at
       FROM spaces WHERE id = ? AND owner_id = ?`,
    [spaceId, ownerId],
  );
  if (!row) throw notFound();
  const [[questions], [[{ n }]]] = await Promise.all([
    pool.execute(
      'SELECT id, question_text FROM space_questions WHERE space_id = ? AND is_active = 1 ORDER BY position, id',
      [spaceId],
    ),
    pool.execute('SELECT COUNT(*) AS n FROM testimonials WHERE space_id = ?', [spaceId]),
  ]);
  return toSpace(row, questions.map((q) => ({ id: q.id, text: q.question_text })), Number(n));
}

/**
 * Is `slug` free? The owner's own space (spaceId) counts as free when editing.
 * When taken, suggests the first free `<slug>-2`, `<slug>-3`, … (E3).
 */
export async function slugAvailability(ownerId, slug, spaceId = null) {
  const problem = slugProblem(slug);
  if (problem) return { available: false, error: problem };

  const pool = getPool();
  const [[row]] = await pool.execute('SELECT id, owner_id FROM spaces WHERE slug = ?', [slug]);
  if (!row || (row.id === spaceId && row.owner_id === ownerId)) return { available: true };

  for (let start = 2; start < 1000; start += 50) {
    const candidates = [];
    for (let n = start; n < start + 50; n += 1) {
      const suffix = `-${n}`;
      const base = slug.slice(0, 60 - suffix.length).replace(/-+$/, '');
      candidates.push(`${base}${suffix}`);
    }
    const [taken] = await pool.query('SELECT slug FROM spaces WHERE slug IN (?)', [candidates]);
    const takenSet = new Set(taken.map((t) => t.slug));
    const suggestion = candidates.find((c) => !takenSet.has(c));
    if (suggestion) return { available: false, suggestion };
  }
  return { available: false };
}

// ---------------------------------------------------------------- writes

function rethrowSlugTaken(error) {
  if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, SLUG_TAKEN, { slug: SLUG_TAKEN });
  throw error;
}

async function insertQuestions(conn, spaceId, questions) {
  for (const [i, q] of questions.entries()) {
    await conn.execute(
      'INSERT INTO space_questions (space_id, question_text, position) VALUES (?, ?, ?)', [spaceId, q.text, i + 1]);
  }
}

/**
 * Creates a space if the owner is under their plan's space limit (FR-12, D10).
 * Lock order: the owner row is locked first, then counted, in the same transaction, so
 * concurrent requests cannot exceed the limit.
 */
export async function createSpace(ownerId, { values, questions }) {
  try {
    return await withTransaction(async (conn) => {
      const [[owner]] = await conn.execute(
        `SELECT u.id, p.name AS plan_name, p.max_spaces
           FROM users u JOIN plans p ON p.code = u.plan_code
          WHERE u.id = ? FOR UPDATE OF u`, // lock only the owner row, never the shared plans row
        [ownerId],
      );
      if (!owner) throw notFound();
      const [[{ n }]] = await conn.execute('SELECT COUNT(*) AS n FROM spaces WHERE owner_id = ?', [ownerId]);
      if (Number(n) >= owner.max_spaces) {
        // Upgrading (billing demo) arrives in M7; until then the only way to make room is deleting.
        throw new HttpError(403, `Your ${owner.plan_name} plan allows ${owner.max_spaces} spaces. Delete a space to make room.`);
      }
      const [result] = await conn.query('INSERT INTO spaces SET ?', [{ ...values, owner_id: ownerId }]);
      await insertQuestions(conn, result.insertId, questions);
      return result.insertId;
    });
  } catch (error) {
    return rethrowSlugTaken(error);
  }
}

/**
 * Replaces a space's settings and questions. Questions are diffed against the stored active
 * list (E4, D4): kept -> updated, new -> inserted, removed -> deleted when unanswered,
 * deactivated when answered (old answers keep their question snapshot).
 */
export async function updateSpace(ownerId, spaceId, { values, questions }) {
  try {
    await withTransaction(async (conn) => {
      const [[space]] = await conn.execute(
        'SELECT id FROM spaces WHERE id = ? AND owner_id = ? FOR UPDATE', [spaceId, ownerId]);
      if (!space) throw notFound();

      const [existing] = await conn.execute(
        'SELECT id FROM space_questions WHERE space_id = ? AND is_active = 1', [spaceId]);
      const existingIds = new Set(existing.map((q) => q.id));
      const fields = {};
      questions.forEach((q, i) => {
        if (q.id !== null && !existingIds.has(q.id)) fields[`questions.${i}`] = 'This question no longer exists. Reload the page.';
      });
      if (Object.keys(fields).length) throw validationError(fields);

      await conn.query('UPDATE spaces SET ? WHERE id = ? AND owner_id = ?', [values, spaceId, ownerId]);

      const keptIds = new Set(questions.filter((q) => q.id !== null).map((q) => q.id));
      const removedIds = [...existingIds].filter((id) => !keptIds.has(id));
      if (removedIds.length) {
        const [answered] = await conn.query(
          'SELECT DISTINCT question_id FROM testimonial_answers WHERE question_id IN (?)', [removedIds]);
        const answeredIds = answered.map((a) => a.question_id);
        const answeredSet = new Set(answeredIds);
        const unansweredIds = removedIds.filter((id) => !answeredSet.has(id));
        if (answeredIds.length) {
          await conn.query('UPDATE space_questions SET is_active = 0 WHERE space_id = ? AND id IN (?)', [spaceId, answeredIds]);
        }
        if (unansweredIds.length) {
          await conn.query('DELETE FROM space_questions WHERE space_id = ? AND id IN (?)', [spaceId, unansweredIds]);
        }
      }

      for (const [i, q] of questions.entries()) {
        if (q.id === null) {
          await conn.execute(
            'INSERT INTO space_questions (space_id, question_text, position) VALUES (?, ?, ?)', [spaceId, q.text, i + 1]);
        } else {
          await conn.execute(
            'UPDATE space_questions SET question_text = ?, position = ? WHERE id = ? AND space_id = ?',
            [q.text, i + 1, q.id, spaceId]);
        }
      }
    });
  } catch (error) {
    rethrowSlugTaken(error);
  }
}

/** Deletes a space (cascading to questions, testimonials, answers), then its uploaded files (D11). */
export async function deleteSpace(ownerId, spaceId) {
  const files = await withTransaction(async (conn) => {
    const [[space]] = await conn.execute(
      'SELECT logo_path FROM spaces WHERE id = ? AND owner_id = ? FOR UPDATE', [spaceId, ownerId]);
    if (!space) throw notFound();
    const [photos] = await conn.execute(
      'SELECT photo_path FROM testimonials WHERE space_id = ? AND photo_path IS NOT NULL', [spaceId]);
    await conn.execute('DELETE FROM spaces WHERE id = ? AND owner_id = ?', [spaceId, ownerId]);
    return [space.logo_path, ...photos.map((p) => p.photo_path)];
  });
  await Promise.all(files.map(removeUpload)); // file I/O after commit (D10)
}

/** Existence/ownership check used before reading an upload body. */
export async function assertOwnsSpace(ownerId, spaceId) {
  const [[row]] = await getPool().execute('SELECT id FROM spaces WHERE id = ? AND owner_id = ?', [spaceId, ownerId]);
  if (!row) throw notFound();
}

/** Sets (or clears, with null) the logo path; returns the previous path so the caller can delete it. */
export async function replaceLogo(ownerId, spaceId, newPath) {
  return withTransaction(async (conn) => {
    const [[space]] = await conn.execute(
      'SELECT logo_path FROM spaces WHERE id = ? AND owner_id = ? FOR UPDATE', [spaceId, ownerId]);
    if (!space) throw notFound();
    await conn.execute('UPDATE spaces SET logo_path = ? WHERE id = ? AND owner_id = ?', [newPath, spaceId, ownerId]);
    return space.logo_path;
  });
}
