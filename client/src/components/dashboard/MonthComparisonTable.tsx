import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { monthComparison } from '@/lib/analytics';
import { usePrefs } from '@/lib/prefs';
import { fmtUsd, fmtUsdExact } from '@/lib/utils';
import type { Bucket, Transaction } from '@/types';

/** Per-bucket spending, this month vs. last month, with the change. */
export function MonthComparisonTable({
  buckets,
  thisMonthTxs,
  lastMonthTxs,
}: {
  buckets: Bucket[];
  thisMonthTxs: Transaction[];
  lastMonthTxs: Transaction[];
}) {
  const prefs = usePrefs();
  const fmt = prefs.exactCents ? fmtUsdExact : fmtUsd;
  const rows = monthComparison(buckets, thisMonthTxs, lastMonthTxs);

  return (
    <Card>
      <CardHeader>
        <CardTitle>This month vs. last month</CardTitle>
        <CardDescription>Spending per bucket, compared to last month</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing to compare yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1.5 font-medium">Bucket</th>
                <th className="py-1.5 text-right font-medium">This month</th>
                <th className="py-1.5 text-right font-medium">Last month</th>
                <th className="py-1.5 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.previous > 0 ? Math.round(((r.current - r.previous) / r.previous) * 100) : null;
                return (
                  <tr key={r.name} className="border-b last:border-0">
                    <td className="py-1.5">
                      {r.color && (
                        <span
                          className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: r.color }}
                          aria-hidden
                        />
                      )}
                      {r.name}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{fmt(r.current)}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{fmt(r.previous)}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                      {pct == null ? (
                        r.current > 0 ? (
                          'new'
                        ) : (
                          '—'
                        )
                      ) : (
                        <span className="inline-flex items-center gap-0.5">
                          {pct >= 0 ? (
                            <ArrowUpRight className="h-3.5 w-3.5" aria-label="up" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" aria-label="down" />
                          )}
                          {Math.abs(pct)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
