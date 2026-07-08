export type Provider = 'teller' | 'plaid' | 'csv';

export interface Account {
  id?: number;
  provider: Provider;
  /** Account id from Teller/Plaid; undefined for CSV-only accounts. */
  externalId?: string;
  name: string;
  institution?: string;
  type?: string; // checking | savings | credit | ...
  /** Latest known balance in dollars (from sync; CSV accounts may not have one). */
  balance?: number;
  /** Teller/Plaid access token. Stored ONLY in local IndexedDB, never in the cloud. */
  accessToken?: string;
  lastSyncedAt?: string; // ISO timestamp
}

export interface Transaction {
  id?: number;
  accountId: number;
  /** Provider transaction id — used to de-duplicate on re-sync. */
  externalId?: string;
  date: string; // YYYY-MM-DD
  description: string;
  /** Dollars. Negative = money out (spending), positive = money in (income). */
  amount: number;
  /** null = Uncategorized (no rule matched, not manually assigned). */
  bucketId: number | null;
  source: 'sync' | 'csv';
}

export interface Bucket {
  id?: number;
  /**
   * Self-referencing parent. null = top-level bucket.
   * The schema supports arbitrary depth; the v1 UI only exposes 2 levels.
   */
  parentId: number | null;
  name: string;
  /** Monthly budget limit in dollars; null = no budget set. */
  monthlyLimit: number | null;
}

export type MatchType = 'contains' | 'startsWith';

export interface Rule {
  id?: number;
  bucketId: number;
  /** Case-insensitive match against the transaction description. */
  keyword?: string;
  matchType: MatchType;
  /** Amount bounds compared against the ABSOLUTE transaction amount. */
  minAmount: number | null;
  maxAmount: number | null;
  /** Restrict the rule to one source account; null = any account. */
  accountId: number | null;
  /** ISO timestamp; newest rule wins specificity ties. */
  createdAt: string;
}

export interface MetaEntry {
  key: string;
  value: string;
}

export interface ServerConfig {
  csvOnly: boolean;
  teller: { applicationId: string | null; environment: string };
  plaidEnabled: boolean;
}
