// Testimonials service (M3): public collection page (FR-05, FR-06), submission with accept
// but lock and the hard cap (FR-12, PRD §5), and the owner inbox (FR-07).
//
// Public functions take a slug and never return owner, email, plan, or count data (R7).
// Owner functions are scoped by owner_id; another owner's space is "not found" (E8).
import { getPool, withTransaction } from '../db.js';
import { HttpError, notFound, validationError } from '../lib/http.js';
import { removeUpload, uploadUrl } from '../lib/uploads.js';
import { charLength, isPlainObject, Validator } from '../lib/validate.js';

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
  if (typeof slug !== 'string' || slug.length > 60) return null;
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
        v.error('answers', 'This form changed while you were filling it in. Reload the page and try again.');
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

/**
 * Saves a testimonial (E24). The photo (already type-checked and saved by the caller) is
 * deleted again if anything fails. Inside one transaction the space row is locked and the
 * saved testimonials counted, so concurrent submissions can never exceed HARD_CAP. Past the
 * plan limit the testimonial is still saved; it is "locked" by its rank (calculated, not stored).
 */
export async function submitTestimonial(slug, { data, photoPath = null }) {
  try {
    const space = await loadPublicSpace(slug);
    if (!space) throw notFound();
    const { values, answers } = parseSubmission(space, data, { hasPhoto: Boolean(photoPath) });
    if (space.photo_mode !== 'off') values.photo_path = photoPath;

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

    // Keep the stored photo only when the space actually collects photos.
    if (photoPath && space.photo_mode === 'off') await removeUpload(photoPath);
    return { thankYouMessage: space.thank_you_message || DEFAULT_THANK_YOU };
  } catch (error) {
    await removeUpload(photoPath);
    throw error;
  }
}

// ---------------------------------------------------------------- owner inbox (E28–E30)

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
         FROM (SELECT t.*, ROW_NUMBER() OVER (ORDER BY t.created_at, t.id) AS rn
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
  const [[row]] = await pool.execute(
    `SELECT r.* FROM (SELECT t.*, ROW_NUMBER() OVER (ORDER BY t.created_at, t.id) AS rn
                        FROM testimonials t WHERE t.space_id = ?) r
      WHERE r.id = ?`,
    [spaceId, testimonialId],
  );
  if (!row) throw notFound();
  if (Number(row.rn) > space.max_visible) {
    throw new HttpError(403, `This testimonial is locked on the ${space.plan_name} plan. Upgrade to see it.`, undefined, { locked: true });
  }
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
