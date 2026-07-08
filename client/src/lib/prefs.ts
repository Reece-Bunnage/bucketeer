import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/db';

/**
 * User preferences: appearance + dashboard layout. Stored in the meta table
 * (key 'prefs') so they live locally like everything else, and they're
 * included in JSON backups.
 */
export interface Prefs {
  theme: 'light' | 'dark' | 'system';
  accent: AccentName;
  /** Budget-vs-actual: Recharts bar chart, or a progress-bar list. */
  budgetChartStyle: 'bars' | 'progress';
  cashFlowStyle: 'bars' | 'area';
  cashFlowMonths: 3 | 6 | 12;
  showNetWorth: boolean;
  showCashFlow: boolean;
  showChildBreakdown: boolean;
  /** Show cents everywhere instead of rounded whole dollars. */
  exactCents: boolean;
  compactTables: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  accent: 'blue',
  budgetChartStyle: 'bars',
  cashFlowStyle: 'bars',
  cashFlowMonths: 6,
  showNetWorth: true,
  showCashFlow: true,
  showChildBreakdown: true,
  exactCents: false,
  compactTables: false,
};

export type AccentName = 'blue' | 'violet' | 'green' | 'orange' | 'rose' | 'teal';

/** hsl = CSS variable value for --primary/--ring; chart = concrete SVG color. */
export const ACCENTS: Record<AccentName, { label: string; hsl: string; chart: string }> = {
  blue: { label: 'Blue', hsl: '221.2 83.2% 53.3%', chart: '#2563eb' },
  violet: { label: 'Violet', hsl: '262.1 83.3% 57.8%', chart: '#7c3aed' },
  green: { label: 'Green', hsl: '142.1 76.2% 36.3%', chart: '#16a34a' },
  orange: { label: 'Orange', hsl: '24.6 95% 53.1%', chart: '#ea580c' },
  rose: { label: 'Rose', hsl: '346.8 77.2% 49.8%', chart: '#e11d48' },
  teal: { label: 'Teal', hsl: '173 80% 32%', chart: '#0d9488' },
};

/** Swatches offered for per-bucket colors (used in charts and bucket lists). */
export const BUCKET_COLOR_PALETTE = [
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#14b8a6', // teal
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#64748b', // slate
];

/** Reactive prefs (merged over defaults); safe to call in any component. */
export function usePrefs(): Prefs {
  const stored = useLiveQuery(async () => (await db.meta.get('prefs'))?.value, []);
  if (!stored) return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(stored) as Partial<Prefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function updatePrefs(patch: Partial<Prefs>): Promise<void> {
  const current = (await db.meta.get('prefs'))?.value;
  const merged = { ...DEFAULT_PREFS, ...(current ? JSON.parse(current) : {}), ...patch };
  await db.meta.put({ key: 'prefs', value: JSON.stringify(merged) });
}

/** Apply theme + accent to the document. Called from App on pref changes. */
export function applyTheme(prefs: Prefs, systemDark: boolean): void {
  const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && systemDark);
  document.documentElement.classList.toggle('dark', dark);
  const accent = ACCENTS[prefs.accent] ?? ACCENTS.blue;
  document.documentElement.style.setProperty('--primary', accent.hsl);
  document.documentElement.style.setProperty('--ring', accent.hsl);
}
