import { updatePrefs, usePrefs, type Prefs } from '@/lib/prefs';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

/** Every dashboard widget a user can turn on or off (Salesforce-style picker). */
const WIDGETS: Array<{ field: keyof Prefs; label: string; desc: string }> = [
  { field: 'showStatTiles', label: 'This month at a glance', desc: 'Income, spending, net, and savings rate tiles' },
  { field: 'showChildBreakdown', label: 'Sub-bucket breakdown', desc: 'Table under the budget chart with per-sub-bucket detail' },
  { field: 'showNetWorth', label: 'Balance across accounts', desc: 'Total and per-account balances' },
  { field: 'showCashFlow', label: 'Cash flow', desc: 'Income vs. expenses over recent months' },
  { field: 'showSpendingShare', label: 'Where the money went', desc: 'Donut of spending share by bucket this month' },
  { field: 'showMonthComparison', label: 'This month vs. last month', desc: 'Per-bucket spending compared to last month' },
  { field: 'showTopMerchants', label: 'Top merchants', desc: 'Merchants ranked by spending this month' },
  { field: 'showLargestTransactions', label: 'Largest transactions', desc: 'Biggest single expenses this month' },
  { field: 'showSpendingPace', label: 'Spending pace', desc: 'Running total vs. an even pace toward your budget' },
];

/** Checkbox list shared by the dashboard's Customize dialog and Settings. */
export function WidgetToggles() {
  const prefs = usePrefs();
  return (
    <div className="space-y-2">
      {WIDGETS.map((w) => (
        <label key={w.field} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={Boolean(prefs[w.field])}
            onChange={(e) => updatePrefs({ [w.field]: e.target.checked })}
          />
          <span>
            {w.label}
            <span className="block text-xs text-muted-foreground">{w.desc}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function CustomizeDashboardDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} title="Customize dashboard">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pick which widgets appear. The budget-vs-actual chart is always shown — it's the point of
          the app. Changes save instantly.
        </p>
        <WidgetToggles />
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Dialog>
  );
}
