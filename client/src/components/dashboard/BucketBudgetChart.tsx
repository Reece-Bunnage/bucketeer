import { Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fmtUsd } from '@/lib/utils';
import type { BucketSpend } from '@/lib/analytics';

const SPENT_COLOR = 'hsl(221 83% 53%)'; // blue
const OVER_COLOR = 'hsl(32 95% 44%)'; // amber (paired with icon/text, not color alone)
const BUDGET_COLOR = 'hsl(215 20% 82%)';

/**
 * The dashboard's primary element: this month's spending vs. budget per
 * top-level bucket (child spending rolled up). Height scales with the number
 * of buckets so 1 bucket and 20 buckets both read cleanly.
 */
export function BucketBudgetChart({ tree }: { tree: BucketSpend[] }) {
  const data = tree
    .filter((n) => n.spent > 0 || n.limit != null)
    .map((n) => ({
      name: n.bucket.name,
      spent: Math.round(n.spent * 100) / 100,
      budget: n.limit ?? 0,
      over: n.over,
    }));

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No spending or budgets yet this month. Create buckets with monthly limits, then sync or import transactions.
      </p>
    );
  }

  const overBuckets = tree.filter((n) => n.over);

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={Math.max(140, data.length * 56)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <XAxis type="number" tickFormatter={(v) => fmtUsd(Number(v))} fontSize={12} />
          <YAxis type="category" dataKey="name" width={110} fontSize={12} />
          <Tooltip formatter={(v) => fmtUsd(Number(v))} cursor={{ fill: 'hsl(210 40% 96%)' }} />
          <Legend />
          <Bar dataKey="budget" name="Budget" fill={BUDGET_COLOR} radius={3} barSize={10} />
          <Bar dataKey="spent" name="Spent" radius={3} barSize={10}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.over ? OVER_COLOR : SPENT_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {overBuckets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {overBuckets.map((n) => (
            <Badge key={n.bucket.id} variant="warning">
              <AlertTriangle className="h-3 w-3" />
              {n.bucket.name}: {fmtUsd(n.spent - (n.limit ?? 0))} over budget
            </Badge>
          ))}
        </div>
      )}

      {/* Child-level breakdown for parents that have children with activity */}
      {tree.some((n) => n.children.some((c) => c.spent > 0 || c.limit != null)) && (
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
                    <td className="py-1.5 text-right tabular-nums">{fmtUsd(c.spent)}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                      {c.limit != null ? fmtUsd(c.limit) : '—'}
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
