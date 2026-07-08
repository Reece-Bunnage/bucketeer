import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.js';
import tellerRoutes from './routes/teller.js';
import plaidRoutes from './routes/plaid.js';
import { errorHandler } from './middleware/errorHandler.js';

// Stateless local proxy: holds bank API secrets from .env and forwards
// requests. It never stores tokens or transactions — all data lives in
// the browser's IndexedDB.
const app = express();
const PORT = Number(process.env.PORT || 4000);

// Only the local Vite dev server may call this API.
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/teller', tellerRoutes);
app.use('/api/plaid', plaidRoutes);

app.use(errorHandler);

app
  .listen(PORT, '127.0.0.1', () => {
    console.log(`[server] bank-sync proxy listening on http://127.0.0.1:${PORT}`);
  })
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[server] Port ${PORT} is already in use. Close the other program or set PORT to a free port in server/.env (and update the proxy port in client/vite.config.ts).`
      );
      process.exit(1);
    }
    throw err;
  });
