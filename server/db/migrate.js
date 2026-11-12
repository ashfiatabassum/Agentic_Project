// Forward-only migration runner (data-model.md: schema_migrations).
//
//   npm run migrate    apply pending server/db/migrations/NNN_*.sql files in order
//   npm run db:reset   drop every table in the configured database, then migrate (dev/test only)
//
// Each applied file is recorded with a SHA-256 checksum; editing an applied file is an error.
// MySQL DDL commits implicitly, so keep one table per migration file.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { config, isDbConfigured } from '../src/config.js';
import { SET_UTC } from '../src/db.js';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const FILE_PATTERN = /^\d{3}_[a-z0-9_]+\.sql$/;

// Databases that db:reset is allowed to wipe. Anything else is refused.
export const RESETTABLE_DATABASES = ['testimonial_mvp', 'testimonial_mvp_test'];

export function checksum(sql) {
  // Normalize line endings so a Windows checkout does not look like an edited file.
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
}

export async function listMigrationFiles(dir = MIGRATIONS_DIR) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const invalid = files.filter((f) => !FILE_PATTERN.test(f));
  if (invalid.length) throw new Error(`Invalid migration file names (expected NNN_name.sql): ${invalid.join(', ')}`);
  return files;
}

async function connect() {
  if (!isDbConfigured()) {
    throw new Error('Database is not configured: set DB_USER and DB_NAME (server/.env or server/.env.test)');
  }
  // A dedicated connection: migration files contain several statements (CREATE + seed INSERTs).
  const conn = await mysql.createConnection({ ...config.db, multipleStatements: true, charset: 'utf8mb4', timezone: 'Z' });
  await conn.query(SET_UTC); // defaults such as plans.created_at in UTC too (E92, code review)
  return conn;
}

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    VARCHAR(255) NOT NULL,
      checksum    CHAR(64) CHARACTER SET ascii NOT NULL,
      applied_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
}

/**
 * Applies pending migrations. Returns { applied: string[], skipped: string[] }.
 * Throws if an already-applied file was changed or an applied file is missing.
 */
export async function migrate({ dir = MIGRATIONS_DIR, log = console.log } = {}) {
  const conn = await connect();
  // Named lock so two migrate processes cannot apply the same file at once.
  const lockName = `migrate:${config.db.database}`;
  const [[{ locked }]] = await conn.query('SELECT GET_LOCK(?, 10) AS locked', [lockName]);
  if (locked !== 1) {
    await conn.end();
    throw new Error(`Another migration is running on ${config.db.database} (could not get lock within 10 s)`);
  }
  try {
    await ensureMigrationsTable(conn);
    const [rows] = await conn.query('SELECT filename, checksum FROM schema_migrations');
    const applied = new Map(rows.map((r) => [r.filename, r.checksum]));
    const files = await listMigrationFiles(dir);

    const missing = [...applied.keys()].filter((f) => !files.includes(f));
    if (missing.length) throw new Error(`Applied migrations are missing from ${dir}: ${missing.join(', ')}`);

    const result = { applied: [], skipped: [] };
    for (const file of files) {
      const sql = await readFile(path.join(dir, file), 'utf8');
      const sum = checksum(sql);
      if (applied.has(file)) {
        if (applied.get(file) !== sum) {
          throw new Error(`Migration ${file} was edited after it was applied (checksum mismatch). Add a new migration instead.`);
        }
        result.skipped.push(file);
        continue;
      }
      log(`applying ${file}`);
      await conn.query(sql);
      await conn.execute('INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)', [file, sum]);
      result.applied.push(file);
    }
    log(`migrations: ${result.applied.length} applied, ${result.skipped.length} already up to date (database ${config.db.database})`);
    return result;
  } finally {
    await conn.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => {});
    await conn.end();
  }
}

/** Drops every table in the configured database. Refused in production or for unknown database names. */
export async function dropAllTables({ log = console.log } = {}) {
  if (config.env === 'production') throw new Error('db:reset is disabled when NODE_ENV=production');
  if (!RESETTABLE_DATABASES.includes(config.db.database)) {
    throw new Error(`db:reset refused: database "${config.db.database}" is not one of ${RESETTABLE_DATABASES.join(', ')}`);
  }
  const conn = await connect();
  try {
    const [tables] = await conn.query(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = ?',
      ['BASE TABLE'],
    );
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { name } of tables) await conn.query('DROP TABLE ??', [name]);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    log(`dropped ${tables.length} tables from ${config.db.database}`);
  } finally {
    await conn.end();
  }
}

// Command-line entry point.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const reset = process.argv.includes('--reset');
  try {
    if (reset) await dropAllTables();
    await migrate();
  } catch (error) {
    console.error(`migrate failed: ${error.message}`);
    process.exitCode = 1;
  }
}
