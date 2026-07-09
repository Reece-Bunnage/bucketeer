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

export interface BudgetSuggestion {
  bucket: Bucket;
  current: number | null;
  /** Average own spending over the last 3 complete months, rounded up to $10. */
  suggested: number;
}

/**
 * Propose monthly limits from spending history. Uses each bucket's OWN
 * spending (transactions filed directly in it, not child rollups — parents
 * get their number from the rollup anyway), averaged over the last 3
 * complete calendar months, skipping months with no data.
 */
export function suggestBudgets(buckets: Bucket[], transactions: Transaction[]): BudgetSuggestion[] {
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = 1; i <= 3; i++) {
    monthKeys.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7));
  }
  const spendByBucketMonth = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.amount >= 0 || tx.bucketId == null) continue;
    const mk = monthKey(tx.date);
    if (!monthKeys.includes(mk)) continue;
    const key = `${tx.bucketId}|${mk}`;
    spendByBucketMonth.set(key, (spendByBucketMonth.get(key) ?? 0) + -tx.amount);
  }
  const suggestions: BudgetSuggestion[] = [];
  for (const bucket of buckets) {
    const monthly = monthKeys
      .map((mk) => spendByBucketMonth.get(`${bucket.id}|${mk}`))
      .filter((v): v is number => v != null && v > 0);
    if (monthly.length === 0) continue;
    const avg = monthly.reduce((sum, v) => sum + v, 0) / monthly.length;
    suggestions.push({ bucket, current: bucket.monthlyLimit, suggested: Math.ceil(avg / 10) * 10 });
  }
  return suggestions.sort((a, b) => b.suggested - a.suggested);
}

export interface WeekSegment {
  start: string; // YYYY-MM-DD (inclusive)
  end: string; // YYYY-MM-DD (inclusive)
  label: string; // e.g. "6/1–6/6"
  days: number;
  /** True if today falls inside this segment. */
  current: boolean;
}

/**
 * Split the current month into calendar weeks (Sun–Sat). The first and last
 * segments are usually partial, so callers prorate weekly budgets by `days`.
 */
export function monthWeeks(now = new Date()): WeekSegment[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const iso = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const segments: WeekSegment[] = [];
  let start = 1;
  while (start <= daysInMonth) {
    const startDow = new Date(year, month, start).getDay(); // 0 = Sunday
    const end = Math.min(daysInMonth, start + (6 - startDow));
    segments.push({
      start: iso(start),
      end: iso(end),
      label: `${month + 1}/${start}–${month + 1}/${end}`,
      days: end - start + 1,
      current: now.getDate() >= start && now.getDate() <= end,
    });
    start = end + 1;
  }
  return segments;
}

/** All bucket ids in a BucketSpend subtree (the node + its descendants). */
export function subtreeIds(node: BucketSpend): Set<number> {
  const ids = new Set<number>([node.bucket.id!]);
  const walk = (n: BucketSpend) => {
    for (const c of n.children) {
      ids.add(c.bucket.id!);
      walk(c);
    }
  };
  walk(node);
  return ids;
}

/** Spending (positive dollars) per week segment for the given bucket ids. */
export function weeklySpend(
  bucketIds: Set<number> | null, // null = ALL spending regardless of bucket
  monthTransactions: Transaction[],
  segments: WeekSegment[]
): number[] {
  const totals = segments.map(() => 0);
  for (const tx of monthTransactions) {
    if (tx.amount >= 0) continue;
    if (bucketIds && (tx.bucketId == null || !bucketIds.has(tx.bucketId))) continue;
    const idx = segments.findIndex((s) => tx.date >= s.start && tx.date <= s.end);
    if (idx !== -1) totals[idx] += -tx.amount;
  }
  return totals;
}

/** Headline totals for one month's transactions. */
export function monthTotals(monthTransactions: Transaction[]) {
  let income = 0;
  let spending = 0;
  for (const tx of monthTransactions) {
    if (tx.amount >= 0) income += tx.amount;
    else spending += -tx.amount;
  }
  return { income, spending, net: income - spending };
}

/** Merchants ranked by spending this month (grouped by description). */
export function topMerchants(monthTransactions: Transaction[], limit = 6) {
  const groups = new Map<string, { name: string; total: number; count: number }>();
  for (const tx of monthTransactions) {
    if (tx.amount >= 0) continue;
    const key = tx.description.trim().toUpperCase();
    const entry = groups.get(key) ?? { name: tx.description.trim(), total: 0, count: 0 };
    entry.total += -tx.amount;
    entry.count++;
    groups.set(key, entry);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

/** Biggest individual expenses this month. */
export function largestExpenses(monthTransactions: Transaction[], limit = 6): Transaction[] {
  return monthTransactions
    .filter((t) => t.amount < 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, limit);
}

export interface ShareSlice {
  name: string;
  value: number;
  color: string | null; // null = component assigns a fallback
}

/**
 * Share of this month's spending by top-level bucket. Top slices + "Other",
 * with uncategorized spending as its own explicitly-gray slice.
 */
export function spendingShare(tree: BucketSpend[], monthTransactions: Transaction[], maxSlices = 5): ShareSlice[] {
  const named = tree
    .filter((n) => n.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .map((n) => ({ name: n.bucket.name, value: n.spent, color: n.bucket.color ?? null }));
  const top = named.slice(0, maxSlices);
  const rest = named.slice(maxSlices).reduce((sum, s) => sum + s.value, 0);
  if (rest > 0) top.push({ name: 'Other buckets', value: rest, color: '#94a3b8' });
  const uncat = uncategorizedSummary(monthTransactions).spent;
  if (uncat > 0) top.push({ name: 'Uncategorized', value: uncat, color: '#64748b' });
  return top;
}

/** Per-parent spending, this month vs. last month. */
export function monthComparison(
  buckets: Bucket[],
  thisMonthTxs: Transaction[],
  lastMonthTxs: Transaction[]
) {
  const current = bucketSpendTree(buckets, thisMonthTxs);
  const previous = bucketSpendTree(buckets, lastMonthTxs);
  const prevByBucketId = new Map(previous.map((n) => [n.bucket.id, n.spent]));
  return current
    .map((n) => ({
      name: n.bucket.name,
      color: n.bucket.color ?? null,
      current: n.spent,
      previous: prevByBucketId.get(n.bucket.id) ?? 0,
    }))
    .filter((r) => r.current > 0 || r.previous > 0)
    .sort((a, b) => b.current - a.current);
}

/**
 * Cumulative spending by day this month, plus an even "budget pace" line
 * (total budget spread across the month). Actual stops at today.
 */
export function spendingPace(monthTransactions: Transaction[], totalBudget: number | null) {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  const daily = new Array<number>(daysInMonth + 1).fill(0);
  for (const tx of monthTransactions) {
    if (tx.amount >= 0) continue;
    const day = Number(tx.date.slice(8, 10));
    if (day >= 1 && day <= daysInMonth) daily[day] += -tx.amount;
  }
  let cumulative = 0;
  const points: Array<{ day: number; actual: number | null; pace: number | null }> = [];
  for (let day = 1; day <= daysInMonth; day++) {
    cumulative += daily[day];
    points.push({
      day,
      actual: day <= today ? Math.round(cumulative * 100) / 100 : null,
      pace: totalBudget != null ? Math.round(((totalBudget * day) / daysInMonth) * 100) / 100 : null,
    });
  }
  return points;
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
