import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development, the browser talks only to Vite (port 5173); requests to /api are
// forwarded to the Express server, so cookies stay same-origin and no CORS is needed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: false,
      },
      // Uploaded logos (and later photos) are served by Express.
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: false,
      },
    },
  },
});
