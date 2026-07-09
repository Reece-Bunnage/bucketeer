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
import { Input } from '@/components/ui/input';
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
  // Links from the dashboard / Buckets page land here pre-filtered.
  const [uncategorizedOnly, setUncategorizedOnly] = useState(searchParams.get('uncategorized') === '1');
  const [bucketFilter, setBucketFilter] = useState<string>(searchParams.get('bucket') ?? 'all');
  const [search, setSearch] = useState('');
  const [ruleFrom, setRuleFrom] = useState<Transaction | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<number | null>(null);

  const months = useMemo(
    () => [...new Set(transactions.map((t) => monthKey(t.date)))].sort().reverse(),
    [transactions]
  );

  // Selecting a parent bucket includes its children's transactions.
  const bucketIds = useMemo(() => {
    if (bucketFilter === 'all' || bucketFilter === 'uncat') return null;
    const id = Number(bucketFilter);
    return new Set([id, ...buckets.filter((b) => b.parentId === id).map((b) => b.id!)]);
  }, [bucketFilter, buckets]);
  const q = search.trim().toLowerCase();

  const filtered = transactions.filter(
    (t) =>
      (month === 'all' || monthKey(t.date) === month) &&
      (accountFilter === 'all' || t.accountId === Number(accountFilter)) &&
      (!uncategorizedOnly || t.bucketId == null) &&
      (bucketFilter === 'all' ||
        (bucketFilter === 'uncat' ? t.bucketId == null : t.bucketId != null && bucketIds!.has(t.bucketId))) &&
      (q === '' || t.description.toLowerCase().includes(q))
  );
  const visible = filtered.slice(0, 500);

  const toggleRow = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allVisibleSelected = visible.length > 0 && visible.every((t) => selected.has(t.id!));
  const toggleAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map((t) => t.id!)));

  const applyBulk = async () => {
    await db.transactions.where('id').anyOf([...selected]).modify({ bucketId: bulkTarget });
    setSelected(new Set());
  };

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
          <Input
            placeholder="Search descriptions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
            aria-label="Search transactions"
          />
          <Select
            value={bucketFilter}
            onChange={(e) => setBucketFilter(e.target.value)}
            className="w-44"
            aria-label="Bucket filter"
          >
            <option value="all">All buckets</option>
            <option value="uncat">Uncategorized</option>
            {buckets
              .filter((b) => b.parentId == null)
              .map((p) => (
                <optgroup key={p.id} label={p.name}>
                  <option value={p.id}>{p.name} (incl. sub-buckets)</option>
                  {buckets
                    .filter((c) => c.parentId === p.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {p.name} › {c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
          </Select>
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

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <BucketSelect
            buckets={buckets}
            value={bulkTarget}
            onChange={setBulkTarget}
            nullLabel="Move to Uncategorized"
            className="h-8 w-56 text-xs"
          />
          <Button size="sm" onClick={applyBulk}>
            Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

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
                  <th className={cn(cell, 'w-8')}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      aria-label="Select all shown transactions"
                    />
                  </th>
                  <th className={cn(cell, 'font-medium')}>Date</th>
                  <th className={cn(cell, 'font-medium')}>Description</th>
                  <th className={cn(cell, 'font-medium')}>Account</th>
                  <th className={cn(cell, 'text-right font-medium')}>Amount</th>
                  <th className={cn(cell, 'font-medium')}>Bucket</th>
                  <th className={cell} />
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className={cell}>
                      <input
                        type="checkbox"
                        checked={selected.has(t.id!)}
                        onChange={() => toggleRow(t.id!)}
                        aria-label={`Select ${t.description}`}
                      />
                    </td>
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
