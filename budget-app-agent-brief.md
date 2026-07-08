# Agent Brief: Local-First Budgeting App — Full Build

## Role
Act as a Staff Software Engineer and Lead Architect. Build the complete application: repo structure, README, initialization configs, and the dashboard/bucket/rule-matching/import UI described below.

## Context: Who this is for
- 2-3 friends, each running the app on their **own separate computer** (no multi-user/profile switching needed — one Dexie/IndexedDB instance per install is fine).
- All are US-based, comfortable setting up API keys, but otherwise want **as little technical friction as possible**.
- Each user will connect **3-5 bank accounts** (checking, savings, credit cards) to their own instance.
- Live bank sync (Teller.io, Plaid optional) is a **priority for v1**, not a stretch goal — CSV import is a fallback/backup path, not the primary flow.

## Locked Blueprint (original requirements)
1. **Target Audience:** Small group of friends, US, running via local terminal (`npm run dev`).
2. **Tech Stack:** React (Vite), Tailwind CSS, Shadcn UI, Recharts, Dexie.js (IndexedDB).
3. **Security:** Local-first, no external cloud backend. Bank credentials/tokens must not live in cloud storage.
4. **Banking APIs:** Teller.io (primary) + Plaid (optional), via environment variables. Include a robust Fallback CSV Statement Import parser.
5. **Backup & Restore:** Settings utility for "Export Backup (JSON)" / "Import Backup (JSON)" to snapshot IndexedDB data to the desktop.
6. **Key Features:** Dynamic expense "buckets" (categories), automated rule-matching for transactions, visual financial health dashboards.

## Critical Architectural Correction (must be incorporated)
**Teller and Plaid cannot be called safely from the browser.** Both require a server-side token exchange, and any `VITE_`-prefixed env var in a Vite app is bundled into client-side JS and visible in dev tools. Secret API keys must never be exposed there.

Resolution: this must be a **two-part local monorepo**, not a single Vite app:
- `client/` — Vite + React + Tailwind + Shadcn + Recharts + Dexie. Handles all budgeting data, UI, and IndexedDB storage. No secret keys here.
- `server/` — a minimal local Node/Express process running on localhost only. Holds Teller/Plaid secret keys from `.env`, handles token exchange, and proxies bank API calls. Never persists data itself — it's a stateless local proxy.
- Both are still 100% local — no cloud hosting, no external backend deployment. This preserves "local-first, no external cloud backend" while keeping secrets safe.

## Usability Requirements (derived from stakeholder interview — must be reflected in Steps 1-3 deliverables)
1. **Single-command startup.** Use `concurrently` (or equivalent) at the root level so a single `npm run dev` starts both `client` and `server` processes together. Users should never need to manage two terminals.
2. **Preflight env-check script.** Before `dev` launches, run a script that validates required `.env` variables are present and well-formed (e.g., Teller cert/key paths, application ID). On failure, print a clear, specific, human-readable error (not a stack trace) naming exactly which variable is missing and a one-line fix.
3. **`.env.example` must be heavily commented**, explaining in plain language what each variable is, where to get it (Teller dashboard, Plaid dashboard), and marking which are optional (Plaid) vs required (Teller).
4. **README.md must assume low technical confidence**, with explicit, copy-pasteable steps: clone → install → copy `.env.example` to `.env` → fill in keys → `npm run dev`. Include a troubleshooting section anticipating common first-run errors (missing Node version, port conflicts, missing keys).
5. **Backup reminder system (design note for later feature work, but should be scaffolded structurally now):** Dexie should include a metadata table tracking `lastBackupDate`. This isn't a Step 1-3 UI task, but the schema/folder placement (`client/src/lib/backup/`) should exist so this is easy to wire up later. Note for the eventual feature build: surface a dismissible reminder banner when backups are >7 days old or after large imports/syncs — do not implement the banner now, just leave room for it.

## Deliverables Requested: Architecture & Setup

### Step 1: Repository folder structure
Lay out the full monorepo tree reflecting the `client/` + `server/` split above, including:
- `client/src/components/` subfolders for dashboard, buckets, transactions, settings, import (CSV parser UI), and `ui/` for Shadcn primitives
- `client/src/lib/` subfolders for `db/` (Dexie schema/config), `rules-engine/`, `csv-parser/`, `backup/`, `api-clients/` (thin client-side wrappers that call the local server proxy, never hold secrets)
- `client/src/hooks/`, `client/src/types/`, `client/src/pages/`, `client/public/`
- `server/src/routes/`, `server/src/services/` (Teller/Plaid integration logic), `server/src/middleware/`
- Root-level `scripts/` (for the preflight env-check script), `docs/`, `.github/workflows/` (optional CI lint/build check)

### Step 2: README.md
Comprehensive, written for a non-expert tester. Must cover:
- What the app is and the local-first/privacy model in plain language
- Prerequisites (Node version, npm)
- Clone instructions
- Install instructions (root-level install covering both `client` and `server` via workspaces)
- `.env` setup walkthrough: copying `.env.example`, obtaining Teller sandbox/production keys, obtaining Plaid keys (marked optional), explaining that these live in `server/.env` and are never sent to the browser
- How to launch (`npm run dev` — single command, explain what it does under the hood in one sentence)
- How to use CSV import as a fallback if a bank isn't supported
- How backup/restore works and why it matters (IndexedDB can be cleared by browser cache clearing)
- Troubleshooting section (missing keys, port conflicts, Node version mismatch)

### Step 3: package.json and config files
- Root `package.json` using npm workspaces (`client`, `server`), with a root `dev` script using `concurrently` to run both, plus a `preflight` script wired to run before `dev`
- `client/package.json` (Vite, React, Tailwind, Shadcn deps, Recharts, Dexie)
- `server/package.json` (Express, Teller/Plaid SDKs or fetch wrappers, dotenv, cors restricted to localhost origin)
- `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json` (client)
- `.env.example` at the `server/` level (heavily commented per usability requirement above)
- `.eslintrc` / basic lint config (optional but recommended for an open-source repo)
- `.gitignore` covering `.env`, `node_modules`, IndexedDB export artifacts, build output

## Feature Spec: Dashboard, Buckets, and Rule-Matching

### Dashboard (primary landing view)
The dashboard's #1 priority element, given top visual weight/first scroll position, is **spending by bucket this month: budget vs. actual**. Design guidance:
- A bucket-by-bucket breakdown (bar or radial progress per bucket) showing amount spent vs. that bucket's monthly limit, using Recharts. Over-budget buckets should be visually distinct (e.g. color shift) without relying on red/green alone (accessibility).
- Secondary elements, in descending priority, below or beside the primary view: overall balance/net worth across connected accounts, and a cash flow trend (income vs. expenses over time, e.g. last 3-6 months).
- Dashboard should read cleanly with only 1 account and scale gracefully to 5 accounts across multiple buckets — avoid layouts that assume a fixed number of accounts/buckets.
- Keep the aesthetic minimal per the original blueprint (Shadcn + Recharts, uncluttered, generous whitespace) — this is a personal tool for 2-3 people, not a SaaS marketing dashboard.

### Buckets (categories)
Buckets are **nested/hierarchical**, e.g. `Food > Groceries`, `Food > Dining Out`, `Housing > Rent`, `Housing > Utilities`. Requirements:
- Dexie schema needs a `buckets` table supporting a `parentId` (self-referencing) so buckets can nest to at least 2 levels (parent + child). Design the schema to not hard-block deeper nesting later, but the UI only needs to support 2 levels for v1.
- Each bucket (parent or child) can carry an optional **monthly budget limit** used for the dashboard's budget-vs-actual view. Parent-level totals should roll up child spending automatically.
- Bucket management UI (create/edit/delete/reassign) lives in `client/src/components/buckets/`. Deleting a bucket with existing transactions should prompt for reassignment rather than silently orphaning transactions.
- Users should be able to manually assign/reassign a transaction's bucket at any time, independent of rule-matching.

### Rule-Matching Engine
Rules auto-categorize incoming transactions (from bank sync or CSV import) into buckets. Rules can match on a **combination of**:
- Merchant/description text (contains/starts-with keyword, case-insensitive)
- Amount range (min/max, or exact)
- Source account (so the same merchant name can route differently per account if needed)
Requirements:
- Rules engine logic lives in `client/src/lib/rules-engine/`, decoupled from UI so it can run against both live-synced transactions and CSV imports.
- When multiple rules match a transaction, apply the most specific rule (more matched criteria wins); if still tied, most recently created rule wins. Document this precedence clearly in code comments — non-technical users will not intuit it from behavior alone.
- Any transaction with no matching rule falls into an "Uncategorized" bucket and should be visually flagged on the transactions view so it doesn't silently skew the dashboard.
- Users can create a rule directly from a transaction ("always categorize transactions like this as X") — this is the primary rule-creation flow; a dedicated rules management screen is secondary but should still exist in `client/src/components/settings/` or a dedicated rules component.

### CSV Import (fallback path)
- Parser lives in `client/src/lib/csv-parser/`, UI in `client/src/components/import/`.
- Must handle common export variations gracefully (different column orders/names/date formats) with a manual column-mapping step if auto-detection fails, since this is the fallback for banks Teller/Plaid don't support.
- Imported transactions run through the same rule-matching engine as live-synced ones.

## Explicitly Out of Scope for This Handoff
- Pixel-perfect visual polish, animations, and empty/loading state design beyond reasonable defaults — build functional, clean UI per the design guidance above, refine later.
- Multi-currency support, investment account tracking, or bill-pay/transfer features — not part of this app's scope.
