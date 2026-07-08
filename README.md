# Bucketeer 🪣 — local-first budgeting for friends

Bucketeer is a small budgeting app you run on **your own computer**. It pulls transactions from your
banks, sorts them into spending "buckets" (like *Food › Groceries*), and shows a dashboard of how
you're doing against your monthly budgets.

**Privacy model, in plain language:** there is no cloud account and no company server. Everything —
your transactions, budgets, and bank connections — is stored in your browser's local database
(IndexedDB) on your machine. A tiny helper server also runs on your machine to talk to the bank APIs,
because bank API keys must never be put inside a web page. Nothing ever leaves your computer except
the direct calls to your bank's API provider (Teller or Plaid).

---

## Setup — step by step

You'll use the **Terminal** app for a few copy-paste commands. On a Mac: press `Cmd + Space`, type
`Terminal`, press Enter. On Windows: open **PowerShell** from the Start menu. You never need to
understand the commands — just paste them and press Enter.

### Step 1: Install Node.js (one-time)

Node is the free program that runs this app.

1. Check if you already have it: paste `node --version` into the terminal and press Enter.
   If it prints something like `v20.11.0` (any number 18.17 or higher), skip to Step 2.
2. Otherwise go to <https://nodejs.org>, click the big green **LTS** download button, open the
   downloaded file, and click through the installer accepting the defaults.
3. **Close the terminal window and open a new one** (it needs a restart to notice Node), then check
   `node --version` again.

### Step 2: Download the app

Paste these two lines into the terminal (they download the code into a `bucketeer` folder and move
you into it):

```bash
git clone https://github.com/reece-bunnage/bucketeer.git
cd bucketeer
```

> If it says `git: command not found` on a Mac, a popup should appear offering to install
> "command line developer tools" — click Install, wait, then re-run the first line.

### Step 3: Install the app's pieces (one-time)

```bash
npm install
```

This takes a minute and prints a lot of text — that's normal.

### Step 4: First launch — it sets up your settings file for you

```bash
npm run dev
```

The **first time**, this will stop with a friendly message: it just created your personal settings
file at `server/.env` and wants you to fill it in. That's the only file you'll ever edit.

**What is this file?** It's a plain-text settings file that holds your bank API key. It stays on your
computer, is never shared or uploaded, and each friend has their own. (The filename starts with a
dot, which macOS hides in Finder — open it through your text editor instead, e.g. in VS Code it's
inside the `server` folder. TextEdit works fine too: in Terminal, `open -e server/.env`.)

Now pick **one** of these two paths:

#### Path A — easiest: no bank connection (CSV import only)

1. Open `server/.env` in a text editor.
2. Find the line `# CSV_ONLY=true` and delete the `#` and the space, so it reads `CSV_ONLY=true`.
3. Save the file. Done — jump to Step 5.

You'll add transactions by downloading CSV statement files from your bank's website and importing
them (the app walks you through it). You can always set up live sync later.

#### Path B — live bank sync with Teller (recommended, ~5 minutes)

Teller is the service that connects the app to your bank. Signing up is free.

1. Go to <https://teller.io> and click **Sign up** (top right).
2. Enter your email and a password, and verify your email if it asks.
3. Once you're in the dashboard, Teller has already created an "application" for you. Look for your
   **Application ID** — a code starting with `app_` (it's shown on the dashboard's main page /
   application settings). Click to copy it.
4. Open `server/.env` in a text editor, find the line `TELLER_APPLICATION_ID=`, and paste the code
   right after the `=` sign — no quotes, no spaces. It should look like:
   `TELLER_APPLICATION_ID=app_abc123xyz`
5. Save the file. Leave everything else alone for now — `TELLER_ENVIRONMENT=sandbox` means you'll
   get **fake practice banks** first, so you can try the app without touching real accounts.

> **Connecting your real bank later:** in the Teller dashboard, go to the certificates section and
> download the **certificate** and **private key** files it offers. Save them
> somewhere permanent (e.g. a `teller-certs` folder in your home folder), and in `server/.env` set
> `TELLER_ENVIRONMENT=development` plus the two file paths under `TELLER_CERT_PATH` /
> `TELLER_KEY_PATH`. The comments in the file show exactly where.

*(There's also optional Plaid support for banks Teller doesn't cover — ignore it unless you need it;
the settings file explains it.)*

### Step 5: Launch for real

```bash
npm run dev
```

A check runs first — if anything in your settings file is wrong, it prints exactly which line to fix
in plain English. When it's happy, both halves of the app start, and you open
**http://localhost:5173** in your browser. That's it. From now on, starting the app is just: open
Terminal, `cd bucketeer`, `npm run dev`.

> 🔒 Why is there a settings file at all? Bank keys can't live inside a web page safely, so a tiny
> helper server runs on your computer and holds them. The keys never leave your machine — the file is
> ignored by git, so it can't accidentally end up on GitHub either.

## Using the app

> **Just want to look around first?** Go to **Settings → Sample data → Add sample data**. You get two
> demo accounts and a few months of pretend transactions to explore the dashboard and practice
> creating rules — then one click removes it all cleanly. No bank setup needed.

1. **Buckets** — a starter set (*Food › Groceries*, *Car & Transport › Gas*, etc.) is created for you.
   "New bucket" opens a picker with dozens of common choices (or create a fully custom one), each
   bucket can carry a monthly budget limit, and sub-bucket budgets automatically add up into the
   parent's total. The calendar button on any parent splits it into *Week 1–4* sub-buckets — dividing
   its budget evenly so you can track spending week by week — and the duplicate button makes numbered
   copies of any bucket.
2. **Settings → Connect a bank (Teller)** — log into your bank in the popup; accounts and
   transactions sync in.
3. **Transactions** — anything the rules don't recognize is flagged **uncategorized**. Pick a bucket
   for it, or click **Rule** to create an "always categorize like this" rule (by merchant keyword,
   amount range, and/or account).
4. **Dashboard** — budget vs. actual per bucket is always front and center; the **Customize** button
   lets you add or hide the other widgets: at-a-glance stat tiles (income/spending/net/savings rate),
   account balances, cash flow, a spending-share donut, this-month-vs-last-month comparison, top
   merchants, largest transactions, and a spending-pace line that shows whether you're ahead of or
   behind your budget for the month.
5. **Make it yours** — **Settings → Appearance & dashboard** has light/dark theme, accent colors,
   chart styles (bars vs. progress bars, bars vs. area), how many months of cash flow to show, which
   dashboard cards appear, cents vs. rounded dollars, and compact tables. Each bucket can also get its
   own chart color (edit the bucket). All of it is saved locally and included in backups.

### CSV import (fallback)

If a bank isn't supported by Teller/Plaid, download a CSV statement from the bank's website and use
**Import CSV**. The app auto-detects the columns (date, description, amount); if it guesses wrong,
fix the mapping in the dropdowns before importing. Imported transactions go through the same rules as
synced ones, and re-importing the same file won't create duplicates.

### Backup & restore — please actually do this 🙏

Your data lives in the browser's storage, and browsers can wipe it ("Clear browsing data", switching
profiles, some cleanup tools). **Settings → Export Backup (JSON)** downloads a snapshot file — do it
after big imports and every week or so. **Import Backup (JSON)** restores everything from that file,
which is also how you move to a new computer.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `npm run dev` prints "✖ Setup problem" | Read the message — it names the exact missing `.env` variable and how to fix it. Usually: you haven't copied `.env.example` to `server/.env`, or `TELLER_APPLICATION_ID` is blank. |
| `node: command not found` or engine warnings | Install Node 20 LTS from <https://nodejs.org>, restart the terminal, re-run `npm install`. |
| Something about **port 5173** or **port 4000** already in use | Another program (or a previous run) is using the port. Close it, or change `PORT` in `server/.env` (and the proxy port in `client/vite.config.ts`). |
| "Cannot reach the local server" in Settings | The server half didn't start — look at the terminal for a `[server]` error, usually a `.env` problem. |
| Teller popup shows only fake banks | You're in `sandbox` mode (that's the default). Switch `TELLER_ENVIRONMENT` in `server/.env` when ready, and add your certificate paths. |
| "Plaid is not configured" | That's fine — Plaid is optional. Add both `PLAID_CLIENT_ID` and `PLAID_SECRET` to enable it. |
| My data disappeared! | You (or the browser) cleared site data. Settings → Import Backup (JSON) with your latest backup file. This is why backups matter. |

## Repository layout

```
bucketeer/
├── package.json              # npm workspaces root; `npm run dev` runs preflight + both apps
├── scripts/preflight.mjs     # friendly .env validation before startup
├── docs/ARCHITECTURE.md      # how the pieces fit together
├── .github/workflows/ci.yml  # lint/build check
├── client/                   # Vite + React + Tailwind + Shadcn-style UI + Recharts + Dexie
│   └── src/
│       ├── pages/            # Dashboard, Transactions, Buckets, Import, Settings
│       ├── components/       # dashboard/ buckets/ transactions/ import/ settings/ ui/
│       ├── hooks/            # reactive Dexie queries
│       ├── lib/
│       │   ├── db/           # Dexie schema + shared transaction ingest (dedupe + rules)
│       │   ├── rules-engine/ # pure rule-matching logic (precedence documented in code)
│       │   ├── csv-parser/   # CSV parsing, column auto-detection
│       │   ├── backup/       # export/import JSON + backup-reminder scaffolding
│       │   └── api-clients/  # thin wrappers that call the local server (no secrets)
│       └── types/
└── server/                   # stateless localhost proxy — holds bank API secrets from .env
    └── src/
        ├── routes/           # /api/teller/*, /api/plaid/*, /api/health, /api/config
        ├── services/         # Teller mTLS client, Plaid fetch wrapper
        └── middleware/       # error handler
```
