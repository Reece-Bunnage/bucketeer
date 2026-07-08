import { monthTotals } from '@/lib/analytics';
import { usePrefs } from '@/lib/prefs';
import { fmtUsd, fmtUsdExact } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { Transaction } from '@/types';

/** Headline numbers for the current month — stat tiles, not charts. */
export function StatTiles({ monthTxs }: { monthTxs: Transaction[] }) {
  const prefs = usePrefs();
  const fmt = prefs.exactCents ? fmtUsdExact : fmtUsd;
  const { income, spending, net } = monthTotals(monthTxs);
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : null;

  const tiles = [
    { label: 'Income this month', value: fmt(income) },
    { label: 'Spending this month', value: fmt(spending) },
    { label: 'Net', value: `${net < 0 ? '−' : '+'}${fmt(Math.abs(net))}` },
    {
      label: 'Savings rate',
      value: savingsRate != null ? `${savingsRate}%` : '—',
      sub: savingsRate != null ? 'of income kept' : 'no income recorded',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</p>
            {t.sub && <p className="text-xs text-muted-foreground">{t.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
