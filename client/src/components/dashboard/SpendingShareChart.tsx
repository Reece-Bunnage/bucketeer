import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { spendingShare, type BucketSpend } from '@/lib/analytics';
import { BUCKET_COLOR_PALETTE, usePrefs } from '@/lib/prefs';
import { fmtUsd, fmtUsdExact } from '@/lib/utils';
import { chartTooltipStyle } from './BucketBudgetChart';
import type { Transaction } from '@/types';

/**
 * Donut of this month's spending by top-level bucket. Slices use each
 * bucket's own color (fixed-order palette fallback), separated by a surface
 * gap; the legend + tooltip carry identity so color is never the only cue.
 */
export function SpendingShareChart({ tree, monthTxs }: { tree: BucketSpend[]; monthTxs: Transaction[] }) {
  const prefs = usePrefs();
  const fmt = prefs.exactCents ? fmtUsdExact : fmtUsd;
  const slices = spendingShare(tree, monthTxs);
  const total = slices.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where the money went</CardTitle>
        <CardDescription>Share of this month's spending by bucket</CardDescription>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No spending yet this month.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                {slices.map((s, i) => (
                  <Cell key={s.name} fill={s.color ?? BUCKET_COLOR_PALETTE[i % BUCKET_COLOR_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, name) => [
                  `${fmt(Number(v))} (${total > 0 ? Math.round((Number(v) / total) * 100) : 0}%)`,
                  String(name),
                ]}
                contentStyle={chartTooltipStyle}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
