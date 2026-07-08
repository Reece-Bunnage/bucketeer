import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtUsd, monthLabel } from '@/lib/utils';

interface CashFlowPoint {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
}

/** Income vs. expenses over the last few months. */
export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash flow</CardTitle>
        <CardDescription>Income vs. expenses, last {data.length} months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <XAxis dataKey="label" fontSize={12} />
            <YAxis tickFormatter={(v) => fmtUsd(Number(v))} fontSize={12} width={70} />
            <Tooltip formatter={(v) => fmtUsd(Number(v))} cursor={{ fill: 'hsl(210 40% 96%)' }} />
            <Legend />
            <Bar dataKey="income" name="Income" fill="hsl(173 58% 39%)" radius={3} />
            <Bar dataKey="expenses" name="Expenses" fill="hsl(221 83% 53%)" radius={3} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
