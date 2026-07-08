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
    color: '#059669',
    children: [
      { name: 'Groceries', color: '#059669' },
      { name: 'Dining Out', color: '#0d9488' },
      { name: 'Coffee & Snacks', color: '#65a30d' },
    ],
  },
  {
    parent: 'Housing',
    color: '#4f46e5',
    children: [
      { name: 'Rent / Mortgage', color: '#4f46e5' },
      { name: 'Utilities', color: '#7c3aed' },
      { name: 'Internet & Phone', color: '#7c3aed' },
      { name: 'Home Maintenance', color: '#4f46e5' },
    ],
  },
  {
    parent: 'Car & Transport',
    color: '#0891b2',
    children: [
      { name: 'Gas', color: '#0891b2' },
      { name: 'Car Payment', color: '#0891b2' },
      { name: 'Car Insurance', color: '#2563eb' },
      { name: 'Parking & Tolls', color: '#0d9488' },
      { name: 'Public Transit', color: '#0891b2' },
    ],
  },
  {
    parent: 'Fun',
    color: '#c026d3',
    children: [
      { name: 'Entertainment', color: '#c026d3' },
      { name: 'Subscriptions', color: '#db2777' },
      { name: 'Hobbies', color: '#db2777' },
      { name: 'Travel & Vacation', color: '#c026d3' },
    ],
  },
  {
    parent: 'Health',
    color: '#65a30d',
    children: [
      { name: 'Doctor & Pharmacy', color: '#65a30d' },
      { name: 'Gym & Fitness', color: '#65a30d' },
    ],
  },
  {
    parent: 'Shopping',
    color: '#ea580c',
    children: [
      { name: 'Clothing', color: '#ea580c' },
      { name: 'Electronics', color: '#64748b' },
      { name: 'Home Goods', color: '#7c3aed' },
    ],
  },
  {
    parent: 'Family',
    color: '#db2777',
    children: [
      { name: 'Kids & Childcare', color: '#db2777' },
      { name: 'Pets', color: '#ea580c' },
    ],
  },
  {
    parent: 'Money',
    color: '#059669',
    children: [
      { name: 'Savings', color: '#059669' },
      { name: 'Debt Payments', color: '#ea580c' },
      { name: 'Gifts & Charity', color: '#db2777' },
    ],
  },
  {
    parent: 'Other',
    color: '#64748b',
    children: [
      { name: 'Personal Care', color: '#64748b' },
      { name: 'Education', color: '#4f46e5' },
      { name: 'Miscellaneous', color: '#ea580c' },
    ],
  },
];
