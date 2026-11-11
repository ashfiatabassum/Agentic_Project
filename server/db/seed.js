// Demo data for local development and screenshots: npm run seed (after npm run migrate or db:reset).
// Synthetic people and text only — no real personal data.
//
// Creates one demo owner on the Free plan with two spaces:
//   - "Acme Bakery": questions, job title/company/rating fields, mixed moderation states
//   - "Pixel Studio": minimal space with default settings
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { config, isDbConfigured } from '../src/config.js';
import { hashPassword } from '../src/lib/password.js';

export const DEMO_OWNER = { name: 'Demo Owner', email: 'demo@example.com', password: 'demo-password' };

const BAKERY_TESTIMONIALS = [
  { name: 'Nadia Rahman', job_title: 'Café owner', company: 'Brew & Co', rating: 5, body: 'The sourdough is the best in town. Our customers ask for it by name.', consent_public: 1, consent_social: 1, on_wall: 1, is_favorite: 1 },
  { name: 'Tanvir Hasan', job_title: 'Event planner', company: 'Bright Events', rating: 5, body: 'They delivered 300 pastries for a wedding, on time and beautifully packed.', consent_public: 1, consent_social: 0, on_wall: 1 },
  { name: 'Sara Ahmed', job_title: '', company: '', rating: 4, body: 'Lovely cakes. The delivery window could be a little more precise.', consent_public: 1, consent_social: 0 },
  { name: 'Imran Chowdhury', job_title: 'Teacher', company: '', rating: 5, body: 'My kids now refuse any other bread. Thank you!', consent_public: 0, consent_social: 0 },
  { name: 'Spam Bot', job_title: '', company: '', rating: 1, body: 'Buy cheap followers at example dot test', consent_public: 1, consent_social: 1, is_hidden: 1 },
];

async function seed() {
  if (config.env === 'production') throw new Error('seed is disabled when NODE_ENV=production');
  if (!isDbConfigured()) throw new Error('Database is not configured: set DB_* values in server/.env');

  const conn = await mysql.createConnection({ ...config.db, charset: 'utf8mb4', timezone: 'Z' });
  try {
    const [existing] = await conn.execute('SELECT id FROM users WHERE email = ?', [DEMO_OWNER.email]);
    if (existing.length) {
      console.log(`seed skipped: ${DEMO_OWNER.email} already exists (run npm run db:reset first for a clean dataset)`);
      return;
    }

    // CPU-heavy hashing happens before the transaction (mysql skill: keep slow work outside transactions).
    const passwordHash = await hashPassword(DEMO_OWNER.password);

    await conn.beginTransaction();
    const [owner] = await conn.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [DEMO_OWNER.name, DEMO_OWNER.email, passwordHash],
    );

    const [bakery] = await conn.execute(
      `INSERT INTO spaces (owner_id, slug, title, subtitle, prompt, thank_you_message, theme_code, brand_color,
                           job_title_mode, company_mode, rating_mode)
       VALUES (?, 'acme-bakery', 'Acme Bakery', 'Fresh bread every morning since 2019',
               'How was your experience with Acme Bakery?', 'Thank you! Your words mean a lot to our bakers.',
               'warm', '#C2410C', 'optional', 'optional', 'required')`,
      [owner.insertId],
    );
    const questions = ['What did you order?', 'Would you recommend us to a friend?'];
    const questionIds = [];
    for (const [i, text] of questions.entries()) {
      const [q] = await conn.execute('INSERT INTO space_questions (space_id, question_text, position) VALUES (?, ?, ?)', [bakery.insertId, text, i + 1]);
      questionIds.push(q.insertId);
    }

    for (const [i, t] of BAKERY_TESTIMONIALS.entries()) {
      const [row] = await conn.execute(
        `INSERT INTO testimonials (space_id, name, email, job_title, company, rating, body,
                                   consent_public, consent_social, is_hidden, is_favorite, on_wall, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP() - INTERVAL ? DAY)`,
        [bakery.insertId, t.name, `customer${i + 1}@example.com`, t.job_title, t.company, t.rating, t.body,
          t.consent_public, t.consent_social, t.is_hidden ?? 0, t.is_favorite ?? 0, t.on_wall ?? 0, (BAKERY_TESTIMONIALS.length - i) * 3],
      );
      await conn.execute(
        'INSERT INTO testimonial_answers (testimonial_id, question_id, question_snapshot, answer_text, position) VALUES (?, ?, ?, ?, 1), (?, ?, ?, ?, 2)',
        [row.insertId, questionIds[0], questions[0], 'A sourdough loaf and croissants', row.insertId, questionIds[1], questions[1], 'Yes'],
      );
    }

    await conn.execute(
      `INSERT INTO spaces (owner_id, slug, title, prompt) VALUES (?, 'pixel-studio', 'Pixel Studio', 'What was it like working with us?')`,
      [owner.insertId],
    );

    await conn.commit();
    console.log(`seeded: ${DEMO_OWNER.email} / ${DEMO_OWNER.password} (Free plan), 2 spaces, ${BAKERY_TESTIMONIALS.length} testimonials in acme-bakery (database ${config.db.database})`);
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw error;
  } finally {
    await conn.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seed().catch((error) => {
    console.error(`seed failed: ${error.message}`);
    process.exitCode = 1;
  });
}
