import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleHelp, SlidersHorizontal } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/db';
import { useAccounts, useAllTransactions, useBuckets, useCurrentMonthTransactions } from '@/hooks/useData';
import { bucketSpendTree, cashFlowByMonth, uncategorizedSummary } from '@/lib/analytics';
import { usePrefs } from '@/lib/prefs';
import { fmtUsd } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BucketBudgetChart } from '@/components/dashboard/BucketBudgetChart';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { NetWorthCard } from '@/components/dashboard/NetWorthCard';
import { StatTiles } from '@/components/dashboard/StatTiles';
import { SpendingShareChart } from '@/components/dashboard/SpendingShareChart';
import { TopMerchantsTable } from '@/components/dashboard/TopMerchantsTable';
import { LargestTransactionsTable } from '@/components/dashboard/LargestTransactionsTable';
import { MonthComparisonTable } from '@/components/dashboard/MonthComparisonTable';
import { SpendingPaceChart } from '@/components/dashboard/SpendingPaceChart';
import { CustomizeDashboardDialog } from '@/components/dashboard/CustomizeDashboard';

export function Dashboard() {
  const prefs = usePrefs();
  const accounts = useAccounts() ?? [];
  const buckets = useBuckets() ?? [];
  const monthTxs = useCurrentMonthTransactions() ?? [];
  const allTxs = useAllTransactions() ?? [];
  const lastMonthTxs =
    useLiveQuery(() => {
      const d = new Date();
      const key = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 7);
      return db.transactions.where('date').between(`${key}-01`, `${key}-99`).toArray();
    }, []) ?? [];
  const [customizing, setCustomizing] = useState(false);

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Button variant="outline" size="sm" onClick={() => setCustomizing(true)}>
          <SlidersHorizontal className="h-3.5 w-3.5" /> Customize
        </Button>
      </div>

      {/* Primary element: budget vs. actual this month (always shown) */}
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

      {prefs.showStatTiles && <StatTiles monthTxs={monthTxs} />}

      {/* Optional widgets — toggle via Customize */}
      <div className="grid gap-4 lg:grid-cols-2">
        {prefs.showNetWorth && <NetWorthCard accounts={accounts} />}
        {prefs.showCashFlow && <CashFlowChart data={cashFlowByMonth(allTxs, prefs.cashFlowMonths)} />}
        {prefs.showSpendingShare && <SpendingShareChart tree={tree} monthTxs={monthTxs} />}
        {prefs.showMonthComparison && (
          <MonthComparisonTable buckets={buckets} thisMonthTxs={monthTxs} lastMonthTxs={lastMonthTxs} />
        )}
        {prefs.showSpendingPace && <SpendingPaceChart tree={tree} monthTxs={monthTxs} />}
        {prefs.showTopMerchants && <TopMerchantsTable monthTxs={monthTxs} />}
        {prefs.showLargestTransactions && <LargestTransactionsTable monthTxs={monthTxs} buckets={buckets} />}
      </div>

      {customizing && <CustomizeDashboardDialog onClose={() => setCustomizing(false)} />}
    </div>
  );
}
