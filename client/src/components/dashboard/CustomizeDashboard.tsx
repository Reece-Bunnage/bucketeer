import { updatePrefs, usePrefs, type Prefs } from '@/lib/prefs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

export interface WidgetDef {
  /** Key used in prefs.widgetOrder; null = not orderable (lives inside the primary card). */
  key: string | null;
  field: keyof Prefs;
  label: string;
  desc: string;
}

/** Every dashboard widget a user can turn on or off (Salesforce-style picker). */
export const WIDGETS: WidgetDef[] = [
  { key: 'statTiles', field: 'showStatTiles', label: 'This month at a glance', desc: 'Income, spending, net, savings rate' },
  { key: 'netWorth', field: 'showNetWorth', label: 'Balance across accounts', desc: 'Total and per-account balances' },
  { key: 'cashFlow', field: 'showCashFlow', label: 'Cash flow', desc: 'Income vs. expenses by month' },
  { key: 'spendingShare', field: 'showSpendingShare', label: 'Where the money went', desc: 'Spending share by bucket' },
  { key: 'monthComparison', field: 'showMonthComparison', label: 'This vs. last month', desc: 'Per-bucket change table' },
  { key: 'spendingPace', field: 'showSpendingPace', label: 'Spending pace', desc: 'Running total vs. budget pace' },
  { key: 'topMerchants', field: 'showTopMerchants', label: 'Top merchants', desc: 'Ranked by spending this month' },
  { key: 'largestTransactions', field: 'showLargestTransactions', label: 'Largest transactions', desc: 'Biggest single expenses' },
  { key: null, field: 'showChildBreakdown', label: 'Sub-bucket breakdown', desc: 'Detail table inside the budget chart' },
];

/** Tiny decorative mockup of each widget so users see what they're enabling. */
function PreviewArt({ widget }: { widget: string | null | keyof Prefs }) {
  switch (widget) {
    case 'statTiles':
      return (
        <div className="grid grid-cols-4 gap-1" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded bg-background p-1.5">
              <div className="h-1 w-6 rounded bg-muted-foreground/30" />
              <div className="mt-1.5 h-2 w-8 rounded bg-primary/70" />
            </div>
          ))}
        </div>
      );
    case 'netWorth':
      return (
        <div className="space-y-1.5" aria-hidden>
          <div className="h-3 w-16 rounded bg-primary/70" />
          {[14, 20, 12].map((w, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-1.5 rounded bg-muted-foreground/30" style={{ width: w * 4 }} />
              <div className="h-1.5 w-8 rounded bg-muted-foreground/50" />
            </div>
          ))}
        </div>
      );
    case 'cashFlow':
      return (
        <div className="flex h-14 items-end gap-1" aria-hidden>
          {[55, 40, 70, 50, 60, 45, 85, 65].map((h, i) => (
            <div
              key={i}
              className={cn('w-2.5 rounded-t', i % 2 === 0 ? 'bg-[#0d9488]' : 'bg-primary/70')}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      );
    case 'spendingShare':
      return (
        <div
          className="relative mx-auto h-14 w-14 rounded-full"
          style={{ background: 'conic-gradient(#059669 0 32%, #4f46e5 32% 58%, #db2777 58% 78%, #94a3b8 78% 100%)' }}
          aria-hidden
        >
          <div className="absolute inset-3 rounded-full bg-muted" />
        </div>
      );
    case 'spendingPace':
      return (
        <svg viewBox="0 0 100 40" className="h-14 w-full" aria-hidden>
          <polyline points="0,38 20,34 35,26 55,22 70,12 85,8" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" />
          <line x1="0" y1="38" x2="100" y2="4" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" />
        </svg>
      );
    case 'monthComparison':
      return (
        <div className="space-y-1.5" aria-hidden>
          {[['↑', 18], ['↓', 24], ['↑', 14]].map(([arrow, w], i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-1.5 rounded bg-muted-foreground/30" style={{ width: Number(w) * 3 }} />
              <span className="text-[10px] leading-none text-muted-foreground">{arrow} 12%</span>
            </div>
          ))}
        </div>
      );
    case 'showChildBreakdown':
    case null:
      return (
        <div className="space-y-1.5" aria-hidden>
          {[24, 18, 22].map((w, i) => (
            <div key={i} className="flex items-center gap-2 pl-3">
              <div className="h-1.5 rounded bg-muted-foreground/30" style={{ width: w * 3 }} />
              <div className="ml-auto h-1.5 w-7 rounded bg-muted-foreground/50" />
            </div>
          ))}
        </div>
      );
    default: // topMerchants, largestTransactions — table-ish rows
      return (
        <div className="space-y-1.5" aria-hidden>
          {[26, 20, 24].map((w, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-1.5 rounded bg-muted-foreground/30" style={{ width: w * 3 }} />
              <div className="h-1.5 w-8 rounded bg-muted-foreground/50" />
            </div>
          ))}
        </div>
      );
  }
}

/** Preview-card toggles shared by the Customize dialog and Settings. */
export function WidgetToggles() {
  const prefs = usePrefs();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {WIDGETS.map((w) => {
        const on = Boolean(prefs[w.field]);
        return (
          <label
            key={w.field}
            className={cn(
              'cursor-pointer rounded-lg border p-3 transition-colors',
              on ? 'border-primary' : 'hover:bg-accent/50'
            )}
          >
            <span className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={on}
                onChange={(e) => updatePrefs({ [w.field]: e.target.checked })}
              />
              <span className="text-sm font-medium leading-tight">
                {w.label}
                <span className="block text-xs font-normal text-muted-foreground">{w.desc}</span>
              </span>
            </span>
            <span className={cn('mt-2 block rounded-md bg-muted/60 p-2.5', !on && 'opacity-50')}>
              <PreviewArt widget={w.key ?? w.field} />
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function CustomizeDashboardDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} title="Customize dashboard" wide>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pick which widgets appear — the budget-vs-actual chart is always shown. Rearrange widgets
          by grabbing the ⠿ handle that appears when you hover over one on the dashboard. Changes
          save instantly.
        </p>
        <WidgetToggles />
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Dialog>
  );
}
