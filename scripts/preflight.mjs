#!/usr/bin/env node
/**
 * Preflight env check — runs automatically before `npm run dev` (via `predev`).
 *
 * Validates server/.env so users get one clear, human-readable error message
 * instead of a stack trace or a silently broken bank sync.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, 'server', '.env');
const examplePath = path.join(root, 'server', '.env.example');

function fail(messages) {
  console.error('\n✖ Setup problem — the app was not started.\n');
  for (const m of messages) console.error('  • ' + m);
  console.error('\nFix the above in server/.env and run `npm run dev` again.\n');
  process.exit(1);
}

// First run: create server/.env from the template automatically so users
// never have to copy a hidden dotfile by hand.
if (!fs.existsSync(envPath)) {
  if (!fs.existsSync(examplePath)) {
    fail(['server/.env.example is missing — re-download/re-clone the project.']);
  }
  fs.copyFileSync(examplePath, envPath);
  fail([
    'First-time setup: I just created your settings file at  server/.env  — you only need to do this once.',
    'Open that file in a text editor (in VS Code it\'s inside the "server" folder; note the name starts with a dot).',
    'Then EITHER paste your Teller Application ID after  TELLER_APPLICATION_ID=',
    'OR, to skip bank sync and only use CSV import, remove the # from the  # CSV_ONLY=true  line.',
    'The file explains each setting in plain language. Save it, then run  npm run dev  again.',
  ]);
}

// Tiny .env parser (KEY=VALUE lines, # comments). Avoids a dependency here.
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

if (env.CSV_ONLY === 'true') {
  console.log('✔ Preflight OK — running in CSV-only mode (no live bank sync).');
  process.exit(0);
}

const errors = [];

// --- Teller (required for live bank sync) ---
if (!env.TELLER_APPLICATION_ID) {
  errors.push(
    'TELLER_APPLICATION_ID is empty in server/.env. Fix: sign in at https://teller.io, copy your Application ID (it starts with "app_"), and paste it right after the = sign — no quotes, no spaces.',
    'Not ready to set up Teller? Open server/.env and remove the # from the  # CSV_ONLY=true  line to use CSV import only.'
  );
}

const tellerEnv = env.TELLER_ENVIRONMENT || 'sandbox';
if (!['sandbox', 'development', 'production'].includes(tellerEnv)) {
  errors.push(
    `TELLER_ENVIRONMENT is "${tellerEnv}" but must be one of: sandbox, development, production. Fix: set TELLER_ENVIRONMENT=sandbox to start.`
  );
}

// Outside the sandbox, Teller requires a client certificate (mTLS).
if (tellerEnv !== 'sandbox' && ['sandbox', 'development', 'production'].includes(tellerEnv)) {
  for (const key of ['TELLER_CERT_PATH', 'TELLER_KEY_PATH']) {
    if (!env[key]) {
      errors.push(
        `${key} is required when TELLER_ENVIRONMENT=${tellerEnv}. Fix: download your certificate + private key from the Teller dashboard and set ${key} to the file's full path.`
      );
    } else if (!fs.existsSync(path.resolve(root, 'server', env[key]))) {
      errors.push(
        `${key} points to "${env[key]}" but no file exists there. Fix: check the path (it is resolved relative to the server/ folder unless absolute).`
      );
    }
  }
}

// --- Plaid (optional — but if one half is set, the other must be too) ---
const hasPlaidId = Boolean(env.PLAID_CLIENT_ID);
const hasPlaidSecret = Boolean(env.PLAID_SECRET);
if (hasPlaidId !== hasPlaidSecret) {
  const missing = hasPlaidId ? 'PLAID_SECRET' : 'PLAID_CLIENT_ID';
  errors.push(
    `Plaid is half-configured: ${missing} is missing. Fix: copy it from https://dashboard.plaid.com (Team Settings → Keys), or remove both PLAID_ values to disable Plaid.`
  );
}

if (errors.length) fail(errors);
console.log(`✔ Preflight OK — Teller ${tellerEnv}${hasPlaidId ? ' + Plaid' : ''} configured. Starting client + server…`);
