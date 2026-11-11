// Reads runtime configuration from environment variables (loaded from server/.env by
// `node --env-file-if-exists=.env`). Never hard-code secrets here.

function toPort(value, fallback) {
  const port = Number.parseInt(value ?? '', 10);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
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
