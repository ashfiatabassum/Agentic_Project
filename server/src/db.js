// Shared MySQL connection pool. Always use parameterized queries:
//   const [rows] = await getPool().execute('SELECT * FROM spaces WHERE id = ?', [id]);
import mysql from 'mysql2/promise';
import { config, isDbConfigured } from './config.js';

let pool = null;

export function getPool() {
  if (!isDbConfigured()) {
    throw new Error('Database is not configured: set DB_USER and DB_NAME in server/.env');
  }
  if (!pool) {
    pool = mysql.createPool({
      ...config.db,
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4',
      timezone: 'Z',
    });
  }
  return pool;
}

// Returns { ok: true } or { ok: false, reason } without throwing; used by the health check.
export async function checkDatabase() {
  if (!isDbConfigured()) return { ok: false, reason: 'not_configured' };
  try {
    await getPool().query('SELECT 1');
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.code ?? 'connection_failed' };
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
