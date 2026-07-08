import { db } from '@/lib/db/db';
import type { Account, Bucket, Rule, Transaction } from '@/types';

/**
 * Backup/restore: IndexedDB can be wiped by a browser "clear site data", so
 * users export a JSON snapshot to disk and re-import it after a wipe or on a
 * new machine. Export also stamps `lastBackupDate` in the meta table, which
 * the future reminder banner (see ./reminder.ts) reads.
 */

interface BackupFile {
  app: 'bucketeer';
  version: 1;
  exportedAt: string;
  accounts: Account[];
  transactions: Transaction[];
  buckets: Bucket[];
  rules: Rule[];
  /** Appearance/dashboard preferences (added later; absent in old backups). */
  prefs?: unknown;
}

export async function exportBackup(): Promise<void> {
  const prefsEntry = await db.meta.get('prefs');
  const backup: BackupFile = {
    app: 'bucketeer',
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts: await db.accounts.toArray(),
    transactions: await db.transactions.toArray(),
    buckets: await db.buckets.toArray(),
    rules: await db.rules.toArray(),
    prefs: prefsEntry ? JSON.parse(prefsEntry.value) : undefined,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bucketeer-backup-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  await db.meta.put({ key: 'lastBackupDate', value: backup.exportedAt });
}

/** Replaces ALL current data with the backup's contents (ids preserved). */
export async function importBackup(file: File): Promise<{ transactions: number; buckets: number }> {
  const parsed = JSON.parse(await file.text()) as Partial<BackupFile>;
  if (parsed.app !== 'bucketeer' || parsed.version !== 1) {
    throw new Error('This file is not a Bucketeer backup (or is from an incompatible version).');
  }
  await db.transaction('rw', [db.accounts, db.transactions, db.buckets, db.rules, db.meta], async () => {
    await Promise.all([db.accounts.clear(), db.transactions.clear(), db.buckets.clear(), db.rules.clear()]);
    await db.accounts.bulkAdd(parsed.accounts ?? []);
    await db.buckets.bulkAdd(parsed.buckets ?? []);
    await db.rules.bulkAdd(parsed.rules ?? []);
    await db.transactions.bulkAdd(parsed.transactions ?? []);
    if (parsed.prefs) await db.meta.put({ key: 'prefs', value: JSON.stringify(parsed.prefs) });
  });
  return { transactions: parsed.transactions?.length ?? 0, buckets: parsed.buckets?.length ?? 0 };
}

export async function getLastBackupDate(): Promise<string | null> {
  return (await db.meta.get('lastBackupDate'))?.value ?? null;
}
