import Dexie, { type Table } from 'dexie';
import type { Account, Bucket, MetaEntry, Rule, Transaction } from '@/types';

/**
 * All app data lives here, in the browser's IndexedDB — nothing is sent to
 * any cloud service. The `meta` table holds app metadata such as
 * `lastBackupDate` (used by the future backup-reminder banner).
 */
export class BucketeerDB extends Dexie {
  accounts!: Table<Account, number>;
  transactions!: Table<Transaction, number>;
  buckets!: Table<Bucket, number>;
  rules!: Table<Rule, number>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super('bucketeer');
    this.version(1).stores({
      accounts: '++id, provider, externalId',
      transactions: '++id, accountId, date, bucketId, externalId',
      // parentId is indexed to support nested (self-referencing) buckets.
      buckets: '++id, parentId, name',
      rules: '++id, bucketId, createdAt',
      meta: 'key',
    });
  }
}

export const db = new BucketeerDB();
