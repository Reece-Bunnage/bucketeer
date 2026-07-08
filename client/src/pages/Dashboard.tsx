import { Link } from 'react-router-dom';
import { CircleHelp } from 'lucide-react';
import { useAccounts, useAllTransactions, useBuckets, useCurrentMonthTransactions } from '@/hooks/useData';
import { bucketSpendTree, cashFlowByMonth, uncategorizedSummary } from '@/lib/analytics';
import { usePrefs } from '@/lib/prefs';
import { fmtUsd } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BucketBudgetChart } from '@/components/dashboard/BucketBudgetChart';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { NetWorthCard } from '@/components/dashboard/NetWorthCard';

export function Dashboard() {
  const prefs = usePrefs();
  const accounts = useAccounts() ?? [];
  const buckets = useBuckets() ?? [];
  const monthTxs = useCurrentMonthTransactions() ?? [];
  const allTxs = useAllTransactions() ?? [];

  const tree = bucketSpendTree(buckets, monthTxs);
  const uncat = uncategorizedSummary(monthTxs);
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (allTxs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Bucketeer 👋</CardTitle>
          <CardDescription>Three steps to a working dashboard:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            1. Create a few <Link className="font-medium underline" to="/buckets">buckets</Link> with
            monthly budgets (e.g. Food › Groceries, $400).
          </p>
          <p>
            2. Connect a bank in <Link className="font-medium underline" to="/settings">Settings</Link>{' '}
            — or <Link className="font-medium underline" to="/import">import a CSV statement</Link>.
          </p>
          <p>3. Categorize anything left over on the Transactions page and create rules as you go.</p>
          <p className="pt-2 text-muted-foreground">
            Just looking around? <Link className="font-medium underline" to="/settings">Settings → Add
            sample data</Link> fills the app with demo accounts and transactions you can play with
            (and remove cleanly later).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary element: budget vs. actual this month */}
      <Card>
        <CardHeader>
          <CardTitle>Spending by bucket — {monthName}</CardTitle>
          <CardDescription>Budget vs. actual, child buckets rolled up into parents</CardDescription>
        </CardHeader>
        <CardContent>
          <BucketBudgetChart tree={tree} />
          {uncat.count > 0 && (
            <p className="mt-3 text-sm">
              <Badge variant="warning">
                <CircleHelp className="h-3 w-3" /> {uncat.count} uncategorized
              </Badge>{' '}
              <span className="text-muted-foreground">
                {fmtUsd(uncat.spent)} of this month's spending isn't in any bucket yet —{' '}
                <Link className="underline" to="/transactions?uncategorized=1">
                  review it
                </Link>{' '}
                so this chart stays honest.
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Secondary elements (toggleable in Settings → Appearance) */}
      {(prefs.showNetWorth || prefs.showCashFlow) && (
        <div className={`grid gap-4 ${prefs.showNetWorth && prefs.showCashFlow ? 'lg:grid-cols-2' : ''}`}>
          {prefs.showNetWorth && <NetWorthCard accounts={accounts} />}
          {prefs.showCashFlow && <CashFlowChart data={cashFlowByMonth(allTxs, prefs.cashFlowMonths)} />}
        </div>
      )}
    </div>
  );
}
