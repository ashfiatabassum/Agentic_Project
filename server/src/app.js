// Builds the Express app without starting a server, so tests can mount it on a random port.
import express from 'express';
import { config } from './config.js';
import { createRateLimiter } from './lib/rateLimit.js';
import { uploadsRoot } from './lib/uploads.js';
import { jsonOnly } from './middleware/jsonOnly.js';
import { createAuthRouter } from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import healthRouter from './routes/health.js';
import { createPublicRouter } from './routes/public.js';
import spacesRouter from './routes/spaces.js';
import testimonialsRouter from './routes/testimonials.js';
import themesRouter from './routes/themes.js';

/**
 * options.rateLimits lets tests raise the limits for files that register many owners;
 * the defaults are the PRD §10 Q9 values. Limiters are per app instance.
 */
export function createApp({ rateLimits = {} } = {}) {
  const app = express();
  const limits = {
    login: createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, ...rateLimits.login }),
    register: createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, ...rateLimits.register }),
    // E25: public testimonial submissions per IP per space.
    submit: createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5, ...rateLimits.submit }),
    // E35: all public submit attempts per IP (valid or not), never given back.
    submitAttempts: createRateLimiter({ windowMs: 10 * 60 * 1000, max: 30, ...rateLimits.submitAttempts }),
  };

  app.disable('x-powered-by');
  // Rate limits key on req.ip; see config.js before enabling this behind a proxy.
  app.set('trust proxy', config.trustProxy);

  // Uploaded logos (and later photos): read-only, random names, type checked on upload.
  app.use('/uploads', express.static(uploadsRoot(), {
    index: false,
    dotfiles: 'deny',
    fallthrough: false,
    setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff'),
  }));

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  // Multipart is allowed only for the logo upload (owner, plus a custom header) and the public
  // testimonial submission (no session involved, so there is nothing for CSRF to abuse).
  app.use('/api', jsonOnly({
    multipartRoutes: [/^\/spaces\/[^/]+\/logo$/, /^\/public\/spaces\/[^/]+\/testimonials$/],
    anyTypeRoutes: [/^\/auth\/logout$/],
  }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', createAuthRouter(limits));
  app.use('/api/themes', themesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/spaces/:spaceId/testimonials', testimonialsRouter);
  app.use('/api/spaces', spacesRouter);
  app.use('/api/public', createPublicRouter(limits));

  // Unknown API routes return JSON, not Express's default HTML page.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler: log details on the server, return { error, fields? } to clients.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    let status = err.status ?? err.statusCode ?? 500;
    let message = err.message;
    if (err.type === 'entity.parse.failed') message = 'Request body is not valid JSON';
    if (err.type === 'entity.too.large') message = 'Request body is too large';
    if (!Number.isInteger(status) || status < 400 || status > 599) status = 500;
    if (status >= 500) console.error(err);
    const body = { error: status >= 500 ? 'Internal server error' : message };
    if (err.fields && status < 500) body.fields = err.fields;
    if (err.extra && status < 500) Object.assign(body, err.extra, { error: body.error });
    res.status(status).json(body);
  });

  return app;
}
