import { db } from './db';

/**
 * Starter buckets created on first run so new users edit a real structure
 * instead of facing an empty page. No budget limits are pre-set — users add
 * their own numbers (limitless buckets don't clutter the dashboard chart).
 */
// Parent colors are a CVD-validated categorical set (see docs/ARCHITECTURE.md).
const STARTER_BUCKETS: Array<{ name: string; color: string; children: Array<[string, string]> }> = [
  { name: 'Food', color: '#059669', children: [['Groceries', '#059669'], ['Dining Out', '#0d9488']] },
  { name: 'Housing', color: '#4f46e5', children: [['Rent / Mortgage', '#4f46e5'], ['Utilities', '#7c3aed']] },
  { name: 'Car & Transport', color: '#0891b2', children: [['Gas', '#0891b2'], ['Insurance & Repairs', '#2563eb']] },
  { name: 'Fun', color: '#db2777', children: [['Entertainment', '#db2777'], ['Subscriptions', '#c026d3']] },
  { name: 'Health', color: '#65a30d', children: [] },
  { name: 'Shopping', color: '#ea580c', children: [] },
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
