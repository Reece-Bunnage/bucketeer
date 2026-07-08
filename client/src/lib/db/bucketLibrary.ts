/**
 * Library of common buckets offered in the "New bucket" picker. Selecting a
 * child creates its parent group automatically (if missing). Users who don't
 * find a fit fall through to the custom-bucket form.
 */
export interface LibraryGroup {
  parent: string;
  color: string;
  children: Array<{ name: string; color: string }>;
}

export const BUCKET_LIBRARY: LibraryGroup[] = [
  {
    parent: 'Food',
    color: '#10b981',
    children: [
      { name: 'Groceries', color: '#10b981' },
      { name: 'Dining Out', color: '#14b8a6' },
      { name: 'Coffee & Snacks', color: '#84cc16' },
    ],
  },
  {
    parent: 'Housing',
    color: '#6366f1',
    children: [
      { name: 'Rent / Mortgage', color: '#6366f1' },
      { name: 'Utilities', color: '#8b5cf6' },
      { name: 'Internet & Phone', color: '#a78bfa' },
      { name: 'Home Maintenance', color: '#818cf8' },
    ],
  },
  {
    parent: 'Car & Transport',
    color: '#0ea5e9',
    children: [
      { name: 'Gas', color: '#06b6d4' },
      { name: 'Car Payment', color: '#0ea5e9' },
      { name: 'Car Insurance', color: '#38bdf8' },
      { name: 'Parking & Tolls', color: '#22d3ee' },
      { name: 'Public Transit', color: '#67e8f9' },
    ],
  },
  {
    parent: 'Fun',
    color: '#d946ef',
    children: [
      { name: 'Entertainment', color: '#d946ef' },
      { name: 'Subscriptions', color: '#ec4899' },
      { name: 'Hobbies', color: '#f472b6' },
      { name: 'Travel & Vacation', color: '#e879f9' },
    ],
  },
  {
    parent: 'Health',
    color: '#84cc16',
    children: [
      { name: 'Doctor & Pharmacy', color: '#84cc16' },
      { name: 'Gym & Fitness', color: '#a3e635' },
    ],
  },
  {
    parent: 'Shopping',
    color: '#64748b',
    children: [
      { name: 'Clothing', color: '#64748b' },
      { name: 'Electronics', color: '#94a3b8' },
      { name: 'Home Goods', color: '#475569' },
    ],
  },
  {
    parent: 'Family',
    color: '#f472b6',
    children: [
      { name: 'Kids & Childcare', color: '#f472b6' },
      { name: 'Pets', color: '#fb923c' },
    ],
  },
  {
    parent: 'Money',
    color: '#10b981',
    children: [
      { name: 'Savings', color: '#34d399' },
      { name: 'Debt Payments', color: '#64748b' },
      { name: 'Gifts & Charity', color: '#ec4899' },
    ],
  },
  {
    parent: 'Other',
    color: '#94a3b8',
    children: [
      { name: 'Personal Care', color: '#94a3b8' },
      { name: 'Education', color: '#6366f1' },
      { name: 'Miscellaneous', color: '#64748b' },
    ],
  },
];
