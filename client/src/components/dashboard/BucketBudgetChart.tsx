import { Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fmtUsd, fmtUsdExact } from '@/lib/utils';
import { ACCENTS, usePrefs } from '@/lib/prefs';
import type { BucketSpend } from '@/lib/analytics';

const OVER_COLOR = '#b45309'; // amber — always paired with an icon/text badge
const BUDGET_COLOR = 'hsl(215 15% 65%)';

export const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  color: 'hsl(var(--card-foreground))',
} as const;

/**
 * The dashboard's primary element: this month's spending vs. budget per
 * top-level bucket (child spending and child budgets rolled up). Renders as a
 * Recharts bar chart or a progress-bar list, per user preference. Buckets
 * with a custom color use it; over-budget always switches to amber + badge.
 */
export function BucketBudgetChart({ tree }: { tree: BucketSpend[] }) {
  const prefs = usePrefs();
  const accent = ACCENTS[prefs.accent]?.chart ?? ACCENTS.blue.chart;
  const fmt = prefs.exactCents ? fmtUsdExact : fmtUsd;

  const rows = tree.filter((n) => n.spent > 0 || n.limit != null);

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No spending or budgets yet this month. Create buckets with monthly limits, then sync or import transactions.
      </p>
    );
  }

  const overBuckets = tree.filter((n) => n.over);
  const barColor = (n: BucketSpend) => (n.over ? OVER_COLOR : n.bucket.color ?? accent);

  return (
    <div className="space-y-3">
      {prefs.budgetChartStyle === 'progress' ? (
        <div className="space-y-3">
          {rows.map((n) => {
            const pct = n.limit != null && n.limit > 0 ? Math.min(100, (n.spent / n.limit) * 100) : null;
            return (
              <div key={n.bucket.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: barColor(n) }}
                      aria-hidden
                    />
                    {n.bucket.name}
                    {n.over && (
                      <Badge variant="warning">
                        <AlertTriangle className="h-3 w-3" /> over
                      </Badge>
                    )}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {fmt(n.spent)}
                    {n.limit != null && <> / {fmt(n.limit)}</>}
                  </span>
                </div>
                {pct != null ? (
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: barColor(n) }}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">no budget set</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(140, rows.length * 56)}>
          <BarChart
            data={rows.map((n) => ({
              name: n.bucket.name,
              spent: Math.round(n.spent * 100) / 100,
              budget: n.limit ?? 0,
              fill: barColor(n),
            }))}
            layout="vertical"
            margin={{ left: 8, right: 16 }}
          >
            <XAxis type="number" tickFormatter={(v) => fmtUsd(Number(v))} tick={{ fill: 'currentColor', fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'currentColor', fontSize: 12 }} />
            <Tooltip
              formatter={(v) => fmt(Number(v))}
              cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
              contentStyle={chartTooltipStyle}
            />
            <Legend />
            <Bar dataKey="budget" name="Budget" fill={BUDGET_COLOR} radius={3} barSize={10} />
            <Bar dataKey="spent" name="Spent" radius={3} barSize={10}>
              {rows.map((n, i) => (
                <Cell key={i} fill={barColor(n)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {overBuckets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {overBuckets.map((n) => (
            <Badge key={n.bucket.id} variant="warning">
              <AlertTriangle className="h-3 w-3" />
              {n.bucket.name}: {fmt(n.spent - (n.limit ?? 0))} over budget
            </Badge>
          ))}
        </div>
      )}

      {prefs.showChildBreakdown &&
        tree.some((n) => n.children.some((c) => c.spent > 0 || c.limit != null)) && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1.5 font-medium">Sub-bucket</th>
                <th className="py-1.5 text-right font-medium">Spent</th>
                <th className="py-1.5 text-right font-medium">Budget</th>
              </tr>
            </thead>
            <tbody>
              {tree.flatMap((parent) =>
                parent.children
                  .filter((c) => c.spent > 0 || c.limit != null)
                  .map((c) => (
                    <tr key={c.bucket.id} className="border-b last:border-0">
                      <td className="py-1.5">
                        <span className="text-muted-foreground">{parent.bucket.name} › </span>
                        {c.bucket.name}
                        {c.over && (
                          <Badge variant="warning" className="ml-2">
                            <AlertTriangle className="h-3 w-3" /> over
                          </Badge>
                        )}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(c.spent)}</td>
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                        {c.limit != null ? fmt(c.limit) : '—'}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        )}
    </div>
  );
}
