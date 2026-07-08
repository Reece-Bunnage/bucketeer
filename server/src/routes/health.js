import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));

// Non-secret config the client needs (e.g. the Teller application id used
// by the Teller Connect widget — it is public, unlike cert/keys/secrets).
router.get('/config', (_req, res) => {
  res.json({
    csvOnly: process.env.CSV_ONLY === 'true',
    teller: {
      applicationId: process.env.TELLER_APPLICATION_ID || null,
      environment: process.env.TELLER_ENVIRONMENT || 'sandbox',
    },
    plaidEnabled: Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
  });
});

export default router;
