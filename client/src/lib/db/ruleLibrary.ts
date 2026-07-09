import { db } from './db';
import { BUCKET_LIBRARY } from './bucketLibrary';
import { categorize } from '@/lib/rules-engine';

/**
 * Pre-built rule packs: common US merchants mapped to a suggested bucket.
 * Users enable whole packs from Settings → Rules → "Add common rules"; the
 * suggested bucket is created automatically if missing (or the user can
 * point the pack at any existing bucket). Each keyword becomes a normal
 * "description contains" rule the user can edit or delete afterwards.
 */
export interface RulePack {
  id: string;
  label: string;
  /** Suggested target bucket (names in the bucket library). child null = the parent itself. */
  suggested: { parent: string; child: string | null };
  keywords: string[];
}

export const RULE_LIBRARY: RulePack[] = [
  {
    id: 'subscriptions',
    label: 'Subscriptions & streaming',
    suggested: { parent: 'Fun', child: 'Subscriptions' },
    keywords: ['NETFLIX', 'SPOTIFY', 'HULU', 'DISNEY PLUS', 'PARAMOUNT+', 'PEACOCK', 'APPLE.COM/BILL', 'AUDIBLE', 'YOUTUBE PREMIUM', 'AMAZON PRIME', 'PRIME VIDEO'],
  },
  {
    id: 'phone-internet',
    label: 'Phone & internet',
    suggested: { parent: 'Housing', child: 'Internet & Phone' },
    keywords: ['VERIZON', 'AT&T', 'T-MOBILE', 'XFINITY', 'COMCAST', 'SPECTRUM', 'COX COMM', 'MINT MOBILE', 'CRICKET WIRELESS', 'GOOGLE FI'],
  },
  {
    id: 'gas',
    label: 'Gas stations',
    suggested: { parent: 'Car & Transport', child: 'Gas' },
    keywords: ['SHELL', 'CHEVRON', 'EXXON', 'MOBIL', 'ARCO', 'TEXACO', 'SUNOCO', 'MARATHON', 'SPEEDWAY', 'VALERO', 'CIRCLE K', 'QUIKTRIP', 'COSTCO GAS'],
  },
  {
    id: 'car-payment',
    label: 'Car payments',
    suggested: { parent: 'Car & Transport', child: 'Car Payment' },
    keywords: ['TOYOTA FINANCIAL', 'HONDA FINANCIAL', 'FORD CREDIT', 'GM FINANCIAL', 'ALLY AUTO', 'CAPITAL ONE AUTO', 'CARMAX'],
  },
  {
    id: 'car-insurance',
    label: 'Car insurance',
    suggested: { parent: 'Car & Transport', child: 'Car Insurance' },
    keywords: ['GEICO', 'PROGRESSIVE', 'STATE FARM', 'ALLSTATE', 'LIBERTY MUTUAL', 'FARMERS INS'],
  },
  {
    id: 'groceries',
    label: 'Grocery stores',
    suggested: { parent: 'Food', child: 'Groceries' },
    keywords: ['TRADER JOE', 'WHOLE FOODS', 'SAFEWAY', 'KROGER', 'ALDI', 'PUBLIX', 'WEGMANS', 'ALBERTSONS', 'H-E-B', 'SPROUTS', 'FOOD LION', 'WINCO', 'MEIJER', 'COSTCO WHOLESALE', "SAM'S CLUB"],
  },
  {
    id: 'rideshare',
    label: 'Rideshare & transit',
    suggested: { parent: 'Car & Transport', child: 'Public Transit' },
    keywords: ['UBER', 'LYFT', 'AMTRAK', 'METRO TRANSIT'],
  },
  {
    id: 'dining',
    label: 'Fast food & delivery',
    suggested: { parent: 'Food', child: 'Dining Out' },
    keywords: ['MCDONALD', 'STARBUCKS', 'CHIPOTLE', 'CHICK-FIL-A', 'TACO BELL', "WENDY'S", 'BURGER KING', 'SUBWAY', 'DUNKIN', 'PANERA', 'DOORDASH', 'UBER EATS', 'GRUBHUB', "DOMINO'S", 'PIZZA HUT', 'KFC', 'POPEYES', 'IN-N-OUT'],
  },
  {
    id: 'amazon-bigbox',
    label: 'Amazon & big-box stores',
    suggested: { parent: 'Shopping', child: null },
    keywords: ['AMAZON', 'AMZN', 'TARGET', 'WALMART', 'BEST BUY'],
  },
  {
    id: 'clothing',
    label: 'Clothing stores',
    suggested: { parent: 'Shopping', child: 'Clothing' },
    keywords: ['OLD NAVY', 'GAP', 'BANANA REPUBLIC', 'H&M', 'ZARA', 'UNIQLO', 'NORDSTROM', "MACY'S", 'TJ MAXX', 'MARSHALLS', 'ROSS STORES', 'NIKE', 'ADIDAS', 'LULULEMON', 'SHEIN'],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    suggested: { parent: 'Housing', child: 'Utilities' },
    keywords: ['PG&E', 'DUKE ENERGY', 'NATIONAL GRID', 'CON EDISON', 'XCEL ENERGY'],
  },
  {
    id: 'gym',
    label: 'Gym & fitness',
    suggested: { parent: 'Health', child: 'Gym & Fitness' },
    keywords: ['PLANET FITNESS', 'LA FITNESS', '24 HOUR FITNESS', 'EQUINOX', 'CRUNCH FITNESS', 'ANYTIME FITNESS', 'PELOTON', 'YMCA'],
  },
  {
    id: 'pets',
    label: 'Pets',
    suggested: { parent: 'Family', child: 'Pets' },
    keywords: ['CHEWY', 'PETCO', 'PETSMART'],
  },
];

export function suggestedPath(pack: RulePack): string {
  return pack.suggested.child ? `${pack.suggested.parent} › ${pack.suggested.child}` : pack.suggested.parent;
}

/** Find or create the pack's suggested bucket (with library colors). */
async function ensureBucket(parentName: string, childName: string | null): Promise<number> {
  const group = BUCKET_LIBRARY.find((g) => g.parent.toLowerCase() === parentName.toLowerCase());
  const all = await db.buckets.toArray();
  let parent = all.find((b) => b.parentId == null && b.name.toLowerCase() === parentName.toLowerCase());
  const parentId =
    parent?.id ??
    (await db.buckets.add({ name: parentName, parentId: null, monthlyLimit: null, color: group?.color ?? null }));
  if (!childName) return parentId;
  const child = all.find(
    (b) => b.parentId === parentId && b.name.toLowerCase() === childName.toLowerCase()
  );
  if (child?.id != null) return child.id;
  const libChild = group?.children.find((c) => c.name.toLowerCase() === childName.toLowerCase());
  return db.buckets.add({ name: childName, parentId, monthlyLimit: null, color: libChild?.color ?? group?.color ?? null });
}

export interface PackSelection {
  pack: RulePack;
  /** Existing bucket to use, or null = auto-create the suggested one. */
  bucketId: number | null;
}

/**
 * Create rules for the selected packs (skipping keywords that already have a
 * rule), then retroactively categorize existing UNCATEGORIZED transactions.
 * Manually-bucketed transactions are never touched.
 */
export async function addRulePacks(
  selections: PackSelection[]
): Promise<{ rulesAdded: number; categorized: number }> {
  const existingKeywords = new Set(
    (await db.rules.toArray()).map((r) => r.keyword?.toLowerCase()).filter(Boolean)
  );
  let rulesAdded = 0;
  let stamp = Date.now();
  for (const { pack, bucketId } of selections) {
    const target = bucketId ?? (await ensureBucket(pack.suggested.parent, pack.suggested.child));
    for (const keyword of pack.keywords) {
      if (existingKeywords.has(keyword.toLowerCase())) continue;
      existingKeywords.add(keyword.toLowerCase());
      await db.rules.add({
        bucketId: target,
        keyword,
        matchType: 'contains',
        minAmount: null,
        maxAmount: null,
        accountId: null,
        // Staggered timestamps keep tie-breaking deterministic within a batch.
        createdAt: new Date(stamp++).toISOString(),
      });
      rulesAdded++;
    }
  }

  const rules = await db.rules.toArray();
  const uncategorized = (await db.transactions.toArray()).filter((t) => t.bucketId == null);
  let categorized = 0;
  for (const tx of uncategorized) {
    const target = categorize(tx, rules);
    if (target != null) {
      await db.transactions.update(tx.id!, { bucketId: target });
      categorized++;
    }
  }
  return { rulesAdded, categorized };
}
