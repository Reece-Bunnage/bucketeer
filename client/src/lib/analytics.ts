import type { Bucket, Transaction } from '@/types';
import { monthKey } from '@/lib/utils';

export interface BucketSpend {
  bucket: Bucket;
  /** Own spending + all children's spending, in positive dollars. */
  spent: number;
  ownSpent: number;
  /** The limit set on this bucket itself. */
  ownLimit: number | null;
  /** Sum of the children's effective limits (null if none set one). */
  childLimit: number | null;
  /** Effective budget: own limit + child budgets. null if neither exists. */
  limit: number | null;
  over: boolean;
  children: BucketSpend[];
}

/**
 * Budget-vs-actual rollup for one month. Spending = sum of negative amounts,
 * reported positive. Parents automatically include child spending, and child
 * budgets feed into the parent's total budget (own limit + children's limits)
 * — so four "Week N" sub-buckets at $100 give the parent a $400 budget.
 */
export function bucketSpendTree(buckets: Bucket[], monthTransactions: Transaction[]): BucketSpend[] {
  const spentByBucket = new Map<number, number>();
  for (const tx of monthTransactions) {
    if (tx.amount >= 0 || tx.bucketId == null) continue;
    spentByBucket.set(tx.bucketId, (spentByBucket.get(tx.bucketId) ?? 0) + -tx.amount);
  }
  const node = (b: Bucket): BucketSpend => {
    const children = buckets.filter((c) => c.parentId === b.id).map(node);
    const ownSpent = spentByBucket.get(b.id!) ?? 0;
    const spent = ownSpent + children.reduce((sum, c) => sum + c.spent, 0);
    const ownLimit = b.monthlyLimit;
    const childLimits = children.map((c) => c.limit).filter((l): l is number => l != null);
    const childLimit = childLimits.length ? childLimits.reduce((a, l) => a + l, 0) : null;
    const limit = ownLimit == null && childLimit == null ? null : (ownLimit ?? 0) + (childLimit ?? 0);
    return {
      bucket: b,
      spent,
      ownSpent,
      ownLimit,
      childLimit,
      limit,
      over: limit != null && spent > limit,
      children,
    };
  };
  return buckets.filter((b) => b.parentId == null).map(node);
}

/** Uncategorized spending (positive dollars) + count for the month. */
export function uncategorizedSummary(monthTransactions: Transaction[]) {
  const txs = monthTransactions.filter((t) => t.bucketId == null);
  return { count: txs.length, spent: txs.filter((t) => t.amount < 0).reduce((s, t) => s + -t.amount, 0) };
}

/** Income vs. expenses per month for the last `months` months (oldest first). */
export function cashFlowByMonth(transactions: Transaction[], months = 6) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    keys.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7));
  }
  const byMonth = new Map(keys.map((k) => [k, { income: 0, expenses: 0 }]));
  for (const tx of transactions) {
    const entry = byMonth.get(monthKey(tx.date));
    if (!entry) continue;
    if (tx.amount >= 0) entry.income += tx.amount;
    else entry.expenses += -tx.amount;
  }
  return keys.map((k) => ({ month: k, ...byMonth.get(k)! }));
}
