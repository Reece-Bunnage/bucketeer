import { api } from './server';
import { db } from '@/lib/db/db';
import { ingestTransactions, type IngestResult } from '@/lib/db/ingest';
import type { Account } from '@/types';

/**
 * Optional Plaid flow: server mints a link token → Plaid Link runs in the
 * browser → we exchange the public token via the server → the access token is
 * stored in local IndexedDB only. The Link script is loaded on demand.
 */

declare global {
  interface Window {
    Plaid?: {
      create(opts: {
        token: string;
        onSuccess: (publicToken: string) => void;
      }): { open(): void };
    };
  }
}

interface PlaidAccount {
  account_id: string;
  name: string;
  type: string;
  balances: { current: number | null };
}

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  date: string;
  name: string;
  amount: number; // Plaid convention: positive = money OUT
}

function loadPlaidScript(): Promise<void> {
  if (window.Plaid) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Plaid Link failed to load — check your internet connection.'));
    document.head.appendChild(s);
  });
}

export async function connectPlaid(
  onDone: (result: { accounts: number } | { error: string }) => void
): Promise<void> {
  try {
    await loadPlaidScript();
    const { link_token } = await api<{ link_token: string }>('/plaid/link_token', { method: 'POST' });
    const handler = window.Plaid!.create({
      token: link_token,
      onSuccess: async (publicToken) => {
        try {
          const { access_token } = await api<{ access_token: string }>('/plaid/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_token: publicToken }),
          });
          const count = await syncPlaidItem(access_token);
          onDone({ accounts: count });
        } catch (err) {
          onDone({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });
    handler.open();
  } catch (err) {
    onDone({ error: err instanceof Error ? err.message : String(err) });
  }
}

/** Fetch accounts + transactions for one Plaid item and upsert locally. */
export async function syncPlaidItem(accessToken: string): Promise<number> {
  const data = await api<{ accounts: PlaidAccount[]; transactions: PlaidTransaction[] }>(
    '/plaid/transactions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    }
  );
  for (const acct of data.accounts) {
    const existing = await db.accounts.where('externalId').equals(acct.account_id).first();
    const account: Account = {
      ...(existing ?? {}),
      provider: 'plaid',
      externalId: acct.account_id,
      name: acct.name,
      type: acct.type,
      balance: acct.balances.current ?? existing?.balance,
      accessToken,
      lastSyncedAt: new Date().toISOString(),
    };
    const id = existing?.id ?? (await db.accounts.add(account));
    if (existing) await db.accounts.put({ ...account, id });
    await ingestTransactions(
      id,
      data.transactions
        .filter((t) => t.account_id === acct.account_id)
        .map((t) => ({
          externalId: t.transaction_id,
          date: t.date,
          description: t.name,
          amount: -t.amount, // flip to our convention: negative = spending
        })),
      'sync'
    );
  }
  return data.accounts.length;
}

export async function syncPlaidAccount(account: Account): Promise<IngestResult | void> {
  if (!account.accessToken) {
    throw new Error('Account is missing its Plaid connection — reconnect it in Settings.');
  }
  await syncPlaidItem(account.accessToken);
}
