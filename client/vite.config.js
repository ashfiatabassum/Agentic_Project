import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { frameHeadersPlugin } from './frameHeaders.js';

// In development, the browser talks only to Vite; requests to /api are forwarded to the
// Express server, so cookies stay same-origin and no CORS is needed.
//
// Ports (plan.md E55): CLIENT_PORT and API_PROXY_TARGET come from the shell or from a
// gitignored client/.env.local. Defaults keep the usual 5173 → http://localhost:4000.
// These names have no VITE_ prefix, so they are never exposed to browser code.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const port = Number(env.CLIENT_PORT) || 5173;
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:4000';

  return {
    // frameHeadersPlugin (E68): only /embed/:slug may be framed by other sites.
    plugins: [react(), tailwindcss(), frameHeadersPlugin()],
    server: {
      port,
      strictPort: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: false },
        // Uploaded logos and photos are served by Express.
        '/uploads': { target: apiTarget, changeOrigin: false },
      },
    },
  };
});
