import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/db';
import { currentMonthKey } from '@/lib/utils';

// Reactive Dexie queries — components re-render automatically when the
// underlying IndexedDB tables change (e.g. after a sync or import).

export const useAccounts = () => useLiveQuery(() => db.accounts.toArray(), []);
export const useBuckets = () => useLiveQuery(() => db.buckets.toArray(), []);
export const useRules = () => useLiveQuery(() => db.rules.toArray(), []);
export const useAllTransactions = () =>
  useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []);

/** Transactions in the current calendar month. */
export const useCurrentMonthTransactions = () =>
  useLiveQuery(() => {
    const month = currentMonthKey();
    return db.transactions
      .where('date')
      .between(`${month}-01`, `${month}-99`)
      .toArray();
  }, []);
