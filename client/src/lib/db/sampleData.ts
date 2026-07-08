import { db } from './db';
import { createStarterBuckets } from './seed';
import type { Transaction } from '@/types';

/**
 * Demo/sample data so users can explore the dashboard, buckets, and rules
 * before connecting a real bank. Fully reversible: we track which accounts we
 * created and which bucket limits we set (only ones that were null), so
 * "Remove sample data" restores the app exactly as it was.
 */

const META_KEY = 'sampleData';

interface SampleMeta {
  accountIds: number[];
  limitBucketIds: number[];
}

/** Demo monthly limits, applied only to buckets that have no limit yet. */
const DEMO_LIMITS: Array<[string, number]> = [
  ['Groceries', 400],
  ['Dining Out', 150],
  ['Gas', 120],
  ['Utilities', 180],
  ['Rent / Mortgage', 1500],
  ['Subscriptions', 40],
  ['Entertainment', 80],
  ['Shopping', 200],
];

// [description, bucketName (null = intentionally uncategorized, so users can
//  practice creating rules), minAmount, maxAmount, timesPerMonth, account]
const SPENDING: Array<[string, string | null, number, number, number, 'checking' | 'card']> = [
  ["TRADER JOE'S #512", 'Groceries', 35, 95, 3, 'card'],
  ['SAFEWAY STORE 1482', 'Groceries', 25, 80, 2, 'card'],
  ['CHIPOTLE ONLINE', 'Dining Out', 11, 16, 3, 'card'],
  ['STARBUCKS #08841', 'Dining Out', 5, 9, 4, 'card'],
  ['DOORDASH*THAI KITCHEN', 'Dining Out', 22, 45, 1, 'card'],
  ['SHELL OIL 5744221', 'Gas', 32, 58, 3, 'card'],
  ['PG&E WEB PAYMENT', 'Utilities', 85, 140, 1, 'checking'],
  ['COMCAST CABLE COMM', 'Utilities', 70, 70, 1, 'checking'],
  ['NETFLIX.COM', 'Subscriptions', 15.49, 15.49, 1, 'card'],
  ['SPOTIFY USA', 'Subscriptions', 11.99, 11.99, 1, 'card'],
  ['AMC THEATRES #2214', 'Entertainment', 14, 34, 1, 'card'],
  ['TARGET T-1044', 'Shopping', 20, 90, 2, 'card'],
  ['AMAZON MKTPL*2K48Q', null, 12, 65, 2, 'card'],
  ['VENMO PAYMENT', null, 15, 60, 1, 'checking'],
  ['ATM WITHDRAWAL', null, 40, 100, 1, 'checking'],
];

const rand = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 100) / 100;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function sampleDataPresent(): Promise<boolean> {
  return (await db.meta.get(META_KEY)) != null;
}

export async function addSampleData(): Promise<{ transactions: number }> {
  if (await sampleDataPresent()) return { transactions: 0 };

  // Make sure there's a bucket structure to file things into.
  if ((await db.buckets.count()) === 0) await createStarterBuckets();
  const buckets = await db.buckets.toArray();
  const bucketId = (name: string | null) =>
    name == null ? null : buckets.find((b) => b.name.toLowerCase() === name.toLowerCase())?.id ?? null;

  // Demo budget limits — only where the user hasn't set one (reverted on remove).
  const limitBucketIds: number[] = [];
  for (const [name, limit] of DEMO_LIMITS) {
    const bucket = buckets.find((b) => b.name.toLowerCase() === name.toLowerCase());
    if (bucket?.id != null && bucket.monthlyLimit == null) {
      await db.buckets.update(bucket.id, { monthlyLimit: limit });
      limitBucketIds.push(bucket.id);
    }
  }

  const checkingId = await db.accounts.add({
    provider: 'csv',
    name: 'Demo Checking',
    type: 'checking',
    balance: 3241.87,
  });
  const cardId = await db.accounts.add({
    provider: 'csv',
    name: 'Demo Credit Card',
    type: 'credit',
    balance: -482.13,
  });
  const accountOf = { checking: checkingId, card: cardId } as const;

  const today = new Date();
  const txs: Transaction[] = [];
  // Last 4 calendar months, current month only up to today.
  for (let back = 3; back >= 0; back--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - back, 1);
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const maxDay = back === 0 ? today.getDate() : daysInMonth;
    const dayDate = (day: number) =>
      new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(day, maxDay));

    // Fixed monthly items: rent and two paychecks.
    txs.push({
      accountId: checkingId,
      date: iso(dayDate(1)),
      description: 'APARTMENT RENT ACH PMT',
      amount: -1500,
      bucketId: bucketId('Rent / Mortgage'),
      source: 'csv',
    });
    for (const payDay of [1, 15]) {
      if (payDay > maxDay) continue;
      txs.push({
        accountId: checkingId,
        date: iso(dayDate(payDay)),
        description: 'PAYROLL DIRECT DEPOSIT',
        amount: 2600,
        bucketId: null,
        source: 'csv',
      });
    }

    for (const [description, bucketName, min, max, perMonth, acct] of SPENDING) {
      for (let i = 0; i < perMonth; i++) {
        const day = 1 + Math.floor(Math.random() * daysInMonth);
        if (day > maxDay) continue;
        txs.push({
          accountId: accountOf[acct],
          date: iso(dayDate(day)),
          description,
          amount: -rand(min, max),
          bucketId: bucketId(bucketName),
          source: 'csv',
        });
      }
    }
  }

  await db.transactions.bulkAdd(txs);
  const meta: SampleMeta = { accountIds: [checkingId, cardId], limitBucketIds };
  await db.meta.put({ key: META_KEY, value: JSON.stringify(meta) });
  return { transactions: txs.length };
}

export async function removeSampleData(): Promise<void> {
  const entry = await db.meta.get(META_KEY);
  if (!entry) return;
  const meta = JSON.parse(entry.value) as SampleMeta;
  await db.transaction('rw', [db.transactions, db.accounts, db.buckets, db.meta], async () => {
    await db.transactions.where('accountId').anyOf(meta.accountIds).delete();
    await db.accounts.bulkDelete(meta.accountIds);
    for (const id of meta.limitBucketIds) await db.buckets.update(id, { monthlyLimit: null });
    await db.meta.delete(META_KEY);
  });
}
