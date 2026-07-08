import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { largestExpenses } from '@/lib/analytics';
import { usePrefs } from '@/lib/prefs';
import { fmtUsd, fmtUsdExact } from '@/lib/utils';
import { bucketPath } from '@/components/buckets/BucketSelect';
import type { Bucket, Transaction } from '@/types';

/** The single biggest expenses this month. */
export function LargestTransactionsTable({
  monthTxs,
  buckets,
}: {
  monthTxs: Transaction[];
  buckets: Bucket[];
}) {
  const prefs = usePrefs();
  const fmt = prefs.exactCents ? fmtUsdExact : fmtUsd;
  const rows = largestExpenses(monthTxs);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Largest transactions</CardTitle>
        <CardDescription>This month's biggest single expenses</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No spending yet this month.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1.5 font-medium">Date</th>
                <th className="py-1.5 font-medium">Description</th>
                <th className="py-1.5 font-medium">Bucket</th>
                <th className="py-1.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap py-1.5 tabular-nums">{t.date.slice(5)}</td>
                  <td className="max-w-44 truncate py-1.5" title={t.description}>
                    {t.description}
                  </td>
                  <td className="max-w-32 truncate py-1.5 text-muted-foreground">
                    {bucketPath(buckets, t.bucketId)}
                  </td>
                  <td className="whitespace-nowrap py-1.5 text-right tabular-nums">{fmt(-t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
