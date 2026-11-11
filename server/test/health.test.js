// Smoke tests for the API scaffold. Run with `npm test` from server/.
// They do not require a database: without DB_* values the health check reports "not_configured".
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { closePool } from '../src/db.js';

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closePool();
});

test('GET /api/health reports API status and database state', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  const body = await res.json();
  assert.ok([200, 503].includes(res.status));
  assert.equal(body.api, 'ok');
  assert.equal(typeof body.database, 'string');
  assert.equal(res.status === 200, body.database === 'ok');
});

test('unknown API route returns JSON 404', async () => {
  const res = await fetch(`${baseUrl}/api/does-not-exist`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'Not found' });
});

test('X-Powered-By header is not sent', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.headers.get('x-powered-by'), null);
});
