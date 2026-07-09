import { useState } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { db } from '@/lib/db/db';
import { useAccounts, useBuckets, useRules } from '@/hooks/useData';
import { fmtUsd } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BucketSelect, bucketPath } from '@/components/buckets/BucketSelect';
import { RuleDialog } from '@/components/transactions/RuleDialog';
import { RuleLibraryDialog } from './RuleLibraryDialog';

/**
 * Secondary rules screen (the primary flow is "create rule from a
 * transaction" on the Transactions page).
 */
export function RulesManager() {
  const rules = useRules() ?? [];
  const buckets = useBuckets() ?? [];
  const accounts = useAccounts() ?? [];
  const [creating, setCreating] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const accountName = (id: number | null) =>
    id == null ? 'any account' : accounts.find((a) => a.id === id)?.name ?? '?';

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Categorization rules</CardTitle>
          <CardDescription>
            When several rules match a transaction, the most specific one (most criteria) wins; ties
            go to the longer keyword, then the newest rule. Unmatched transactions stay Uncategorized.
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={() => setLibraryOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" /> Add common rules
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" /> New rule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {status && <p className="pb-3 text-sm">{status}</p>}
        {rules.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No rules yet. Fastest start: click <strong>Add common rules</strong> above to auto-file
            phone bills, subscriptions, gas, groceries, Amazon, and more — or open Transactions and
            click "Rule" on any transaction.
          </p>
        ) : (
          <ul className="divide-y">
            {[...rules]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    Description {r.matchType === 'startsWith' ? 'starts with' : 'contains'}{' '}
                    <strong>"{r.keyword}"</strong>
                    {(r.minAmount != null || r.maxAmount != null) && (
                      <>
                        {' '}
                        · amount {r.minAmount != null ? `≥ ${fmtUsd(r.minAmount)}` : ''}
                        {r.minAmount != null && r.maxAmount != null ? ' and ' : ''}
                        {r.maxAmount != null ? `≤ ${fmtUsd(r.maxAmount)}` : ''}
                      </>
                    )}
                    {' '}· {accountName(r.accountId)} → <strong>{bucketPath(buckets, r.bucketId)}</strong>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <BucketSelect
                      buckets={buckets}
                      value={r.bucketId}
                      onChange={(bucketId) => bucketId != null && db.rules.update(r.id!, { bucketId })}
                      nullLabel="(pick bucket)"
                      className="h-8 w-44 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete rule"
                      onClick={() => db.rules.delete(r.id!)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </li>
              ))}
          </ul>
        )}
      </CardContent>
      {creating && (
        <RuleDialog buckets={buckets} accounts={accounts} onClose={() => setCreating(false)} />
      )}
      {libraryOpen && (
        <RuleLibraryDialog buckets={buckets} onClose={() => setLibraryOpen(false)} onDone={setStatus} />
      )}
    </Card>
  );
}
