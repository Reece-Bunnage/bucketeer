import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { topMerchants } from '@/lib/analytics';
import { usePrefs } from '@/lib/prefs';
import { fmtUsd, fmtUsdExact } from '@/lib/utils';
import type { Transaction } from '@/types';

/** Merchants ranked by this month's spending. */
export function TopMerchantsTable({ monthTxs }: { monthTxs: Transaction[] }) {
  const prefs = usePrefs();
  const fmt = prefs.exactCents ? fmtUsdExact : fmtUsd;
  const rows = topMerchants(monthTxs);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top merchants</CardTitle>
        <CardDescription>Where this month's spending concentrated</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No spending yet this month.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1.5 font-medium">Merchant</th>
                <th className="py-1.5 text-right font-medium">Visits</th>
                <th className="py-1.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b last:border-0">
                  <td className="max-w-52 truncate py-1.5" title={r.name}>
                    {r.name}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">{r.count}</td>
                  <td className="py-1.5 text-right tabular-nums">{fmt(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
