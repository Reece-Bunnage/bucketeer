import { db } from './db';

/**
 * Starter buckets created on first run so new users edit a real structure
 * instead of facing an empty page. No budget limits are pre-set — users add
 * their own numbers (limitless buckets don't clutter the dashboard chart).
 */
const STARTER_BUCKETS: Array<{ name: string; color: string; children: Array<[string, string]> }> = [
  { name: 'Food', color: '#10b981', children: [['Groceries', '#10b981'], ['Dining Out', '#14b8a6']] },
  { name: 'Housing', color: '#6366f1', children: [['Rent / Mortgage', '#6366f1'], ['Utilities', '#8b5cf6']] },
  { name: 'Car & Transport', color: '#0ea5e9', children: [['Gas', '#06b6d4'], ['Insurance & Repairs', '#0ea5e9']] },
  { name: 'Fun', color: '#d946ef', children: [['Entertainment', '#d946ef'], ['Subscriptions', '#ec4899']] },
  { name: 'Health', color: '#84cc16', children: [] },
  { name: 'Shopping', color: '#64748b', children: [] },
];

export async function createStarterBuckets(): Promise<void> {
  for (const parent of STARTER_BUCKETS) {
    const parentId = await db.buckets.add({
      name: parent.name,
      parentId: null,
      monthlyLimit: null,
      color: parent.color,
    });
    for (const [name, color] of parent.children) {
      await db.buckets.add({ name, parentId, monthlyLimit: null, color });
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
