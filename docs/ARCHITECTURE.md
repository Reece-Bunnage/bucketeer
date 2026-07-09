# Architecture notes

## Why two processes?

Teller and Plaid cannot be called safely from a browser: both need secret credentials (Teller's mTLS
certificate/private key, Plaid's client secret), and anything bundled into a Vite app — including
`VITE_`-prefixed env vars — is visible in dev tools. So the repo is a two-part local monorepo:

- **client/** — all budgeting data and UI. Dexie/IndexedDB is the single source of truth. Holds no secrets.
- **server/** — a stateless localhost-only Express proxy. Reads secrets from `server/.env`, performs
  the Teller mTLS calls and Plaid token exchange, and forwards results. It persists nothing.

Access tokens returned by Teller Connect / Plaid Link are stored in the client's IndexedDB (local
disk) and sent to the proxy per-request. Both processes are 100% local; there is no cloud backend.

## Data flow

```
bank ↔ Teller/Plaid ↔ server (secrets, stateless) ↔ client fetch /api/* ↔ Dexie (IndexedDB)
CSV file ────────────────────────────────────────────────┘ (csv-parser)
```

Every new transaction — synced or imported — enters through `client/src/lib/db/ingest.ts`, which
de-duplicates (provider id, or date+amount+description fingerprint) and runs the rules engine.

## Rule precedence

Documented in `client/src/lib/rules-engine/index.ts`: most criteria wins, then longer keyword
("uber eats" beats "uber"), then newest rule; no match ⇒ Uncategorized (`bucketId = null`) and
flagged in the UI. Manual assignments are never overwritten by rules (retroactive application only
touches uncategorized transactions). Pre-built rule packs for common merchants live in
`client/src/lib/db/ruleLibrary.ts` (Settings → Rules → "Add common rules").

## Buckets

`buckets.parentId` is self-referencing, so the schema supports arbitrary nesting; the v1 UI exposes
two levels. Parent budget-vs-actual rolls up child spending, and a parent's effective budget is its
own limit plus the sum of its children's limits (`client/src/lib/analytics.ts`). A starter bucket set
is seeded once per install (`client/src/lib/db/seed.ts`, tracked via the `seededDefaultBuckets` meta
key), and the Buckets page has a duplicate action that creates numbered copies (Week 1–4 style).

## Backup reminder (future work — scaffolded)

`db.meta` stores `lastBackupDate`, written on every export. `client/src/lib/backup/reminder.ts`
exposes `isBackupStale()`. The planned feature: a dismissible banner when backups are >7 days old or
after large imports/syncs. Not implemented yet by design.
