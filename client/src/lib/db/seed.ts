import { db } from './db';

/**
 * Starter buckets created on first run so new users edit a real structure
 * instead of facing an empty page. No budget limits are pre-set — users add
 * their own numbers (limitless buckets don't clutter the dashboard chart).
 */
const STARTER_BUCKETS: Array<{ name: string; children: string[] }> = [
  { name: 'Food', children: ['Groceries', 'Dining Out'] },
  { name: 'Housing', children: ['Rent / Mortgage', 'Utilities'] },
  { name: 'Car & Transport', children: ['Gas', 'Insurance & Repairs'] },
  { name: 'Fun', children: ['Entertainment', 'Subscriptions'] },
  { name: 'Health', children: [] },
  { name: 'Shopping', children: [] },
];

export async function createStarterBuckets(): Promise<void> {
  for (const parent of STARTER_BUCKETS) {
    const parentId = await db.buckets.add({ name: parent.name, parentId: null, monthlyLimit: null });
    for (const child of parent.children) {
      await db.buckets.add({ name: child, parentId, monthlyLimit: null });
    }
  }
}

/**
 * Seed exactly once per install (tracked in meta). If the user already has
 * buckets — e.g. they restored a backup before this ran — we mark it done
 * without touching their setup.
 */
export async function seedDefaultBucketsOnce(): Promise<void> {
  if (await db.meta.get('seededDefaultBuckets')) return;
  if ((await db.buckets.count()) === 0) await createStarterBuckets();
  await db.meta.put({ key: 'seededDefaultBuckets', value: new Date().toISOString() });
}
