import { api } from './server';
import { db } from '@/lib/db/db';
import { ingestTransactions, type IngestResult } from '@/lib/db/ingest';
import type { Account, ServerConfig } from '@/types';

/**
 * Teller flow: the Teller Connect widget (loaded in index.html) runs the bank
 * login in the browser and hands back an access token. We store that token in
 * local IndexedDB and send it with each proxy request; the server adds the
 * mTLS certificate and forwards to api.teller.io. No secrets in this file.
 */

declare global {
  interface Window {
    TellerConnect?: {
      setup(opts: {
        applicationId: string;
        environment: string;
        onSuccess: (enrollment: { accessToken: string }) => void;
      }): { open(): void };
    };
  }
}

interface TellerAccount {
  id: string;
  name: string;
  type: string;
  institution?: { name?: string };
}

interface TellerTransaction {
  id: string;
  date: string;
  description: string;
  amount: string; // signed string; negative = money out
}

const tellerHeaders = (token: string) => ({ 'X-Teller-Token': token });

/** Open Teller Connect; on success, save the enrolled accounts and sync them. */
export function connectTeller(
  config: ServerConfig,
  onDone: (result: { accounts: number } | { error: string }) => void
): void {
  if (!window.TellerConnect) {
    onDone({ error: 'Teller Connect failed to load — check your internet connection and reload.' });
    return;
  }
  if (!config.teller.applicationId) {
    onDone({ error: 'TELLER_APPLICATION_ID is not set in server/.env.' });
    return;
  }
  const connect = window.TellerConnect.setup({
    applicationId: config.teller.applicationId,
    environment: config.teller.environment,
    onSuccess: async ({ accessToken }) => {
      try {
        const remote = await api<TellerAccount[]>('/teller/accounts', { headers: tellerHeaders(accessToken) });
        for (const acct of remote) {
          const existing = await db.accounts.where('externalId').equals(acct.id).first();
          const account: Account = {
            ...(existing ?? {}),
            provider: 'teller',
            externalId: acct.id,
            name: acct.name,
            type: acct.type,
            institution: acct.institution?.name,
            accessToken,
          };
          const id = existing?.id ?? (await db.accounts.add(account));
          if (existing) await db.accounts.put({ ...account, id });
          await syncTellerAccount({ ...account, id });
        }
        onDone({ accounts: remote.length });
      } catch (err) {
        onDone({ error: err instanceof Error ? err.message : String(err) });
      }
    },
  });
  connect.open();
}

/** Pull latest balance + transactions for one already-connected account. */
export async function syncTellerAccount(account: Account): Promise<IngestResult> {
  if (!account.id || !account.externalId || !account.accessToken) {
    throw new Error('Account is missing its Teller connection — reconnect it in Settings.');
  }
  const headers = tellerHeaders(account.accessToken);
  const [balances, txs] = await Promise.all([
    api<{ ledger?: string; available?: string }>(`/teller/accounts/${account.externalId}/balances`, { headers }),
    api<TellerTransaction[]>(`/teller/accounts/${account.externalId}/transactions`, { headers }),
  ]);
  const result = await ingestTransactions(
    account.id,
    txs.map((t) => ({
      externalId: t.id,
      date: t.date,
      description: t.description,
      amount: Number(t.amount),
    })),
    'sync'
  );
  await db.accounts.update(account.id, {
    balance: balances.ledger != null ? Number(balances.ledger) : account.balance,
    lastSyncedAt: new Date().toISOString(),
  });
  return result;
}
