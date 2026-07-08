import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { spendingPace, type BucketSpend } from '@/lib/analytics';
import { ACCENTS, usePrefs } from '@/lib/prefs';
import { fmtUsd, fmtUsdExact } from '@/lib/utils';
import { chartTooltipStyle } from './BucketBudgetChart';
import type { Transaction } from '@/types';

const PACE_COLOR = '#94a3b8';

/**
 * Cumulative spending this month vs. an even "budget pace" line (total
 * budget spread across the month). One axis, two labeled series.
 */
export function SpendingPaceChart({ tree, monthTxs }: { tree: BucketSpend[]; monthTxs: Transaction[] }) {
  const prefs = usePrefs();
  const accent = ACCENTS[prefs.accent]?.chart ?? ACCENTS.blue.chart;
  const fmt = prefs.exactCents ? fmtUsdExact : fmtUsd;

  const limits = tree.map((n) => n.limit).filter((l): l is number => l != null);
  const totalBudget = limits.length ? limits.reduce((a, l) => a + l, 0) : null;
  const data = spendingPace(monthTxs, totalBudget);
  const hasSpending = monthTxs.some((t) => t.amount < 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending pace</CardTitle>
        <CardDescription>
          Running total this month{totalBudget != null && <> vs. an even pace toward your {fmtUsd(totalBudget)} total budget</>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasSpending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No spending yet this month.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <XAxis dataKey="day" tick={{ fill: 'currentColor', fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => fmtUsd(Number(v))}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                width={70}
              />
              <Tooltip
                formatter={(v) => fmt(Number(v))}
                labelFormatter={(day) => `Day ${day}`}
                contentStyle={chartTooltipStyle}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                name="Spent so far"
                stroke={accent}
                strokeWidth={2}
                dot={false}
              />
              {totalBudget != null && (
                <Line
                  type="monotone"
                  dataKey="pace"
                  name="Budget pace"
                  stroke={PACE_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
