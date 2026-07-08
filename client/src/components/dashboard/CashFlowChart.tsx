import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtUsd, fmtUsdExact, monthLabel } from '@/lib/utils';
import { ACCENTS, usePrefs } from '@/lib/prefs';
import { chartTooltipStyle } from './BucketBudgetChart';

const INCOME_COLOR = '#0d9488'; // teal, distinct from any accent-colored expenses

interface CashFlowPoint {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
}

/** Income vs. expenses over the last few months — bars or area, per prefs. */
export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  const prefs = usePrefs();
  const expenseColor = ACCENTS[prefs.accent]?.chart ?? ACCENTS.blue.chart;
  const fmt = prefs.exactCents ? fmtUsdExact : fmtUsd;
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.month) }));

  // Recharts inspects direct children by type, so axes are repeated in each
  // branch instead of shared via a fragment.
  const axisProps = { tick: { fill: 'currentColor', fontSize: 12 } };
  const tooltipProps = {
    formatter: (v: unknown) => fmt(Number(v)),
    cursor: { fill: 'rgba(148, 163, 184, 0.15)' },
    contentStyle: chartTooltipStyle,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash flow</CardTitle>
        <CardDescription>Income vs. expenses, last {data.length} months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          {prefs.cashFlowStyle === 'area' ? (
            <AreaChart data={chartData}>
              <XAxis dataKey="label" {...axisProps} />
              <YAxis tickFormatter={(v) => fmtUsd(Number(v))} width={70} {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Legend />
              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                stroke={INCOME_COLOR}
                fill={INCOME_COLOR}
                fillOpacity={0.25}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke={expenseColor}
                fill={expenseColor}
                fillOpacity={0.25}
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData}>
              <XAxis dataKey="label" {...axisProps} />
              <YAxis tickFormatter={(v) => fmtUsd(Number(v))} width={70} {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Legend />
              <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={3} />
              <Bar dataKey="expenses" name="Expenses" fill={expenseColor} radius={3} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
