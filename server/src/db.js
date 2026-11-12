// Shared MySQL connection pool. Always use parameterized queries:
//   const [rows] = await getPool().execute('SELECT * FROM spaces WHERE id = ?', [id]);
import mysql from 'mysql2/promise';
import { config, isDbConfigured } from './config.js';

let pool = null;

/**
 * All DATETIME values are UTC (data-model.md Q3). `timezone: 'Z'` only tells mysql2 how to convert
 * JS Dates; MySQL's own NOW()/CURRENT_TIMESTAMP (column defaults) follow the *session* time zone,
 * which defaults to the server's system zone (Bangladesh, UTC+6, on the dev machine). Every
 * connection therefore sets its session to UTC (M6 finding E92).
 */
export const SET_UTC = "SET time_zone = '+00:00'";

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
    // Runs on each new physical connection, before any query is queued on it. If it fails, the
    // connection is destroyed rather than left in the server's zone (code review).
    pool.pool.on('connection', (conn) => {
      conn.query(SET_UTC, (error) => {
        if (error) {
          console.error('Could not set the MySQL session time zone to UTC:', error.message);
          conn.destroy();
        }
      });
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

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs fn(conn) in one transaction on a pooled connection. A deadlock (MySQL 1213) is
// retried once after a short random backoff (data-model.md D10/R6; mysql skill deadlocks.md);
// any other error rolls back and is re-thrown. fn must only touch the database, so a retry is safe.
export async function withTransaction(fn) {
  for (let attempt = 0; ; attempt += 1) {
    if (attempt > 0) await pause(20 + Math.random() * 50);
    const conn = await getPool().getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback().catch(() => {});
      if (error.code !== 'ER_LOCK_DEADLOCK' || attempt > 0) throw error;
    } finally {
      conn.release();
    }
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
