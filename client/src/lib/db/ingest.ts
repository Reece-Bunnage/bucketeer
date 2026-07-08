import { db } from './db';
import { categorize } from '@/lib/rules-engine';
import type { Transaction } from '@/types';

export interface IncomingTransaction {
  externalId?: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // negative = spending
}

export interface IngestResult {
  added: number;
  duplicates: number;
  uncategorized: number;
}

/**
 * Single entry point for new transactions — used by Teller sync, Plaid sync,
 * AND CSV import, so every transaction goes through the same rule-matching
 * engine and the same de-duplication.
 *
 * De-dup: by provider externalId when present (safe re-syncs), otherwise by
 * exact (date, amount, description) within the account (CSV re-imports).
 */
export async function ingestTransactions(
  accountId: number,
  incoming: IncomingTransaction[],
  source: 'sync' | 'csv'
): Promise<IngestResult> {
  const rules = await db.rules.toArray();
  const existing = await db.transactions.where('accountId').equals(accountId).toArray();
  const byExternalId = new Set(existing.map((t) => t.externalId).filter(Boolean));
  const byFingerprint = new Set(existing.map((t) => `${t.date}|${t.amount}|${t.description}`));

  const toAdd: Transaction[] = [];
  let duplicates = 0;
  let uncategorized = 0;

  for (const inc of incoming) {
    const fingerprint = `${inc.date}|${inc.amount}|${inc.description}`;
    if ((inc.externalId && byExternalId.has(inc.externalId)) || byFingerprint.has(fingerprint)) {
      duplicates++;
      continue;
    }
    byFingerprint.add(fingerprint);
    if (inc.externalId) byExternalId.add(inc.externalId);

    const bucketId = categorize({ ...inc, accountId }, rules);
    if (bucketId === null) uncategorized++;
    toAdd.push({ accountId, source, bucketId, ...inc });
  }

  if (toAdd.length) await db.transactions.bulkAdd(toAdd);
  return { added: toAdd.length, duplicates, uncategorized };
}
