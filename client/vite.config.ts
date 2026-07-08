import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    // All /api calls go to the local bank-sync proxy — the browser never
    // talks to Teller/Plaid directly (secrets live only in server/.env).
    proxy: {
      '/api': 'http://127.0.0.1:4000',
    },
  },
});
