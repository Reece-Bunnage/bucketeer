import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleHelp, Wand2 } from 'lucide-react';
import { db } from '@/lib/db/db';
import { useAccounts, useAllTransactions, useBuckets } from '@/hooks/useData';
import { usePrefs } from '@/lib/prefs';
import { cn, fmtUsdExact, monthKey, monthLabel } from '@/lib/utils';
import type { Transaction } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { BucketSelect } from '@/components/buckets/BucketSelect';
import { RuleDialog } from './RuleDialog';

export function TransactionList() {
  const transactions = useAllTransactions() ?? [];
  const accounts = useAccounts() ?? [];
  const buckets = useBuckets() ?? [];

  const [searchParams] = useSearchParams();
  const [month, setMonth] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  // The dashboard's "review uncategorized" link lands here pre-filtered.
  const [uncategorizedOnly, setUncategorizedOnly] = useState(searchParams.get('uncategorized') === '1');
  const [ruleFrom, setRuleFrom] = useState<Transaction | null>(null);

  const months = useMemo(
    () => [...new Set(transactions.map((t) => monthKey(t.date)))].sort().reverse(),
    [transactions]
  );

  const filtered = transactions.filter(
    (t) =>
      (month === 'all' || monthKey(t.date) === month) &&
      (accountFilter === 'all' || t.accountId === Number(accountFilter)) &&
      (!uncategorizedOnly || t.bucketId == null)
  );

  const uncategorizedCount = transactions.filter((t) => t.bucketId == null).length;
  const accountName = (id: number) => accounts.find((a) => a.id === id)?.name ?? '?';
  const prefs = usePrefs();
  const cell = prefs.compactTables ? 'px-3 py-1' : 'p-3';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {transactions.length} total
            {uncategorizedCount > 0 && (
              <Badge variant="warning" className="ml-2">
                <CircleHelp className="h-3 w-3" /> {uncategorizedCount} uncategorized
              </Badge>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" aria-label="Month filter">
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
          <Select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="w-44"
            aria-label="Account filter"
          >
            <option value="all">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={uncategorizedOnly}
              onChange={(e) => setUncategorizedOnly(e.target.checked)}
            />
            Uncategorized only
          </label>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No transactions match. Sync a bank in Settings or import a CSV to get started.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className={cn(cell, 'font-medium')}>Date</th>
                  <th className={cn(cell, 'font-medium')}>Description</th>
                  <th className={cn(cell, 'font-medium')}>Account</th>
                  <th className={cn(cell, 'text-right font-medium')}>Amount</th>
                  <th className={cn(cell, 'font-medium')}>Bucket</th>
                  <th className={cell} />
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className={cn(cell, 'whitespace-nowrap tabular-nums')}>{t.date}</td>
                    <td className={cn(cell, 'max-w-64 truncate')} title={t.description}>
                      {t.description}
                      {t.bucketId == null && (
                        <Badge variant="warning" className="ml-2">
                          <CircleHelp className="h-3 w-3" /> uncategorized
                        </Badge>
                      )}
                    </td>
                    <td className={cn(cell, 'whitespace-nowrap text-muted-foreground')}>{accountName(t.accountId)}</td>
                    <td className={cn(cell, 'whitespace-nowrap text-right tabular-nums')}>{fmtUsdExact(t.amount)}</td>
                    <td className={cell}>
                      {/* Manual assignment always available, independent of rules */}
                      <BucketSelect
                        buckets={buckets}
                        value={t.bucketId}
                        onChange={(bucketId) => db.transactions.update(t.id!, { bucketId })}
                        className="h-8 w-48 text-xs"
                      />
                    </td>
                    <td className={cell}>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Always categorize transactions like this…"
                        onClick={() => setRuleFrom(t)}
                      >
                        <Wand2 className="h-3.5 w-3.5" /> Rule
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filtered.length > 500 && (
            <p className="p-3 text-center text-xs text-muted-foreground">
              Showing first 500 — narrow with the filters above.
            </p>
          )}
        </CardContent>
      </Card>

      {ruleFrom && (
        <RuleDialog fromTransaction={ruleFrom} buckets={buckets} accounts={accounts} onClose={() => setRuleFrom(null)} />
      )}
    </div>
  );
}
