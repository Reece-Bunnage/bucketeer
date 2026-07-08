import { Router } from 'express';
import { tellerRequest } from '../services/teller.js';

const router = Router();

// The Teller access token comes from the browser on every request (it was
// obtained there via the Teller Connect widget and lives in the user's
// IndexedDB). This server just adds the mTLS certificate and forwards.
function requireToken(req, res) {
  const token = req.get('X-Teller-Token');
  if (!token) {
    res.status(400).json({ error: 'Missing X-Teller-Token header' });
    return null;
  }
  return token;
}

router.get('/accounts', async (req, res, next) => {
  const token = requireToken(req, res);
  if (!token) return;
  try {
    res.json(await tellerRequest('/accounts', token));
  } catch (err) {
    next(err);
  }
});

router.get('/accounts/:id/balances', async (req, res, next) => {
  const token = requireToken(req, res);
  if (!token) return;
  try {
    res.json(await tellerRequest(`/accounts/${req.params.id}/balances`, token));
  } catch (err) {
    next(err);
  }
});

router.get('/accounts/:id/transactions', async (req, res, next) => {
  const token = requireToken(req, res);
  if (!token) return;
  try {
    res.json(await tellerRequest(`/accounts/${req.params.id}/transactions?count=500`, token));
  } catch (err) {
    next(err);
  }
});

export default router;
