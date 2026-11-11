import { createApp } from './app.js';
import { config, isDbConfigured } from './config.js';
import { closePool } from './db.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port} (${config.env})`);
  if (!isDbConfigured()) {
    console.warn('Database not configured: copy server/.env.example to server/.env and fill in DB_* values.');
  }
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
