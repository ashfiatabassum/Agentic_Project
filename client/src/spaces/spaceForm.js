// Plain helpers for the space form (no React).

export const MAX_QUESTIONS = 5;
export const DEFAULT_BRAND_COLOR = '#4F46E5';
export const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// Theme colours live in client code keyed by theme code (data-model.md: themes).
export const THEME_PREVIEW = {
  light: { background: '#FFFFFF', text: '#0F172A', muted: '#64748B' },
  dark: { background: '#0F172A', text: '#F8FAFC', muted: '#94A3B8' },
  warm: { background: '#FFF7ED', text: '#431407', muted: '#9A3412' },
};

export const CUSTOMER_FIELDS = [
  { key: 'jobTitle', label: 'Job title' },
  { key: 'company', label: 'Company' },
  { key: 'socialLink', label: 'Social link' },
  { key: 'photo', label: 'Profile photo' },
  { key: 'rating', label: 'Star rating (1–5)' },
];

/** ASCII slug from a title (E3). Returns '' when nothing usable is left (for example Bangla names). */
export function slugify(text) {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug.length >= 3 ? slug : '';
}

export const randomSlugSuffix = () => Math.random().toString(36).slice(2, 8).padEnd(6, '0');

let nextKey = 0;
export const questionKey = () => `q${(nextKey += 1)}`;

export function emptySpaceForm() {
  return {
    title: '',
    subtitle: '',
    prompt: '',
    thankYouMessage: '',
    slug: '',
    themeCode: 'light',
    brandColor: DEFAULT_BRAND_COLOR,
    fields: { jobTitle: 'off', company: 'off', socialLink: 'off', photo: 'off', rating: 'off' },
    questions: [],
  };
}

/** Server space -> form state (questions get a stable client key for React lists). */
export function formFromSpace(space) {
  return {
    title: space.title,
    subtitle: space.subtitle,
    prompt: space.prompt,
    thankYouMessage: space.thankYouMessage,
    slug: space.slug,
    themeCode: space.themeCode,
    brandColor: space.brandColor,
    fields: { ...space.fields },
    questions: space.questions.map((q) => ({ key: questionKey(), id: q.id, text: q.text })),
  };
}

/** Form state -> request body. */
export function payloadFromForm(form) {
  return {
    ...form,
    questions: form.questions.map(({ id, text }) => (id ? { id, text } : { text })),
  };
}
