// Reads runtime configuration from environment variables (loaded from server/.env by
// `node --env-file-if-exists=.env`). Never hard-code secrets here.

function toPort(value, fallback) {
  const port = Number.parseInt(value ?? '', 10);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
}

const env = process.env.NODE_ENV ?? 'development';

// TRUST_PROXY: only set it when the API runs behind a reverse proxy you control, using an
// Express value such as "loopback" or a hop count like "1". Never "true". Unset = req.ip is the
// direct peer (in development every visitor really is localhost via the Vite proxy).
function trustProxy(value) {
  if (!value) return false;
  if (/^\d+$/.test(value)) return Number(value);
  if (value === 'true') throw new Error('TRUST_PROXY=true would let any client fake its IP; use "loopback" or a hop count');
  return value;
}

export const config = {
  env,
  isProduction: env === 'production',
  trustProxy: trustProxy(process.env.TRUST_PROXY),
  port: toPort(process.env.PORT, 4000),
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: toPort(process.env.DB_PORT, 3306),
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? '',
  },
};

// The database is "configured" once a user and database name are provided.
export function isDbConfigured() {
  return Boolean(config.db.user && config.db.database);
}
