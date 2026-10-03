import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config.
 *
 * INTEGRATION NOTE (real backend):
 * When a real API exists, proxy it here so the browser only ever talks to this
 * origin (no CORS, no keys in the client):
 *
 *   server: {
 *     proxy: {
 *       '/api': { target: process.env.VITE_API_URL, changeOrigin: true }
 *     }
 *   }
 *
 * API keys must live in server-side env vars (VITE_* vars are PUBLIC and get
 * bundled into the client — never put a secret key in a VITE_* variable).
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4174', changeOrigin: true },
    },
    // Required so the sandboxed preview host (https://{port}-{id}.e2b.app) is accepted.
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
});
