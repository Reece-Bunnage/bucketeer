import { Router } from 'express';
import { plaidConfigured, plaidRequest } from '../services/plaid.js';

const router = Router();

router.use((_req, res, next) => {
  if (!plaidConfigured()) {
    return res.status(400).json({
      error: 'Plaid is not configured — add PLAID_CLIENT_ID and PLAID_SECRET to server/.env (optional feature).',
    });
  }
  next();
});

// Step 1 of Plaid Link: create a short-lived link token for the widget.
router.post('/link_token', async (_req, res, next) => {
  try {
    const json = await plaidRequest('/link/token/create', {
      user: { client_user_id: 'bucketeer-local-user' },
      client_name: 'Bucketeer',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });
    res.json({ link_token: json.link_token });
  } catch (err) {
    next(err);
  }
});

// Step 2: exchange the public token from Link for a permanent access token.
// The access token is returned to the browser and stored in IndexedDB only.
router.post('/exchange', async (req, res, next) => {
  try {
    if (!req.body?.public_token) return res.status(400).json({ error: 'Missing public_token' });
    const json = await plaidRequest('/item/public_token/exchange', {
      public_token: req.body.public_token,
    });
    res.json({ access_token: json.access_token });
  } catch (err) {
    next(err);
  }
});

// Fetch accounts + last ~90 days of transactions for an item.
router.post('/transactions', async (req, res, next) => {
  try {
    if (!req.body?.access_token) return res.status(400).json({ error: 'Missing access_token' });
    const end = new Date();
    const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
    const iso = (d) => d.toISOString().slice(0, 10);
    const json = await plaidRequest('/transactions/get', {
      access_token: req.body.access_token,
      start_date: iso(start),
      end_date: iso(end),
      options: { count: 500 },
    });
    res.json({ accounts: json.accounts, transactions: json.transactions });
  } catch (err) {
    next(err);
  }
});

export default router;
