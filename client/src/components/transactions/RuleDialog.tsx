import { useState } from 'react';
import { db } from '@/lib/db/db';
import { ruleMatches } from '@/lib/rules-engine';
import type { Account, Bucket, MatchType, Rule, Transaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { BucketSelect } from '@/components/buckets/BucketSelect';

interface RuleDialogProps {
  /** Prefills the form — the primary "always categorize like this" flow. */
  fromTransaction?: Transaction;
  buckets: Bucket[];
  accounts: Account[];
  onClose: () => void;
}

/**
 * Create a rule, optionally prefilled from a transaction. On save the rule is
 * also applied to existing UNCATEGORIZED transactions (already-bucketed ones
 * are left alone — manual assignments always win).
 */
export function RuleDialog({ fromTransaction, buckets, accounts, onClose }: RuleDialogProps) {
  const [keyword, setKeyword] = useState(fromTransaction?.description ?? '');
  const [matchType, setMatchType] = useState<MatchType>('contains');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [limitToAccount, setLimitToAccount] = useState(false);
  const [accountId, setAccountId] = useState<number | null>(fromTransaction?.accountId ?? null);
  const [bucketId, setBucketId] = useState<number | null>(fromTransaction?.bucketId ?? null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (bucketId == null || !keyword.trim()) return;
    setSaving(true);
    const rule: Rule = {
      bucketId,
      keyword: keyword.trim(),
      matchType,
      minAmount: minAmount.trim() === '' ? null : Math.abs(Number(minAmount)),
      maxAmount: maxAmount.trim() === '' ? null : Math.abs(Number(maxAmount)),
      accountId: limitToAccount ? accountId : null,
      createdAt: new Date().toISOString(),
    };
    await db.rules.add(rule);
    // Retroactively file uncategorized transactions that this rule matches.
    // (bucketId null isn't indexable in Dexie, so filter in memory.)
    const uncategorized = (await db.transactions.toArray()).filter((t) => t.bucketId == null);
    const ids = uncategorized.filter((t) => ruleMatches(rule, t)).map((t) => t.id!);
    if (ids.length) await db.transactions.where('id').anyOf(ids).modify({ bucketId });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="New rule">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="rule-keyword">Description keyword (case-insensitive)</Label>
          <div className="flex gap-2">
            <Select
              className="w-36 shrink-0"
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as MatchType)}
              aria-label="Match type"
            >
              <option value="contains">contains</option>
              <option value="startsWith">starts with</option>
            </Select>
            <Input
              id="rule-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. TRADER JOE"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: trim the keyword to the stable part of the merchant name (drop store numbers/dates).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rule-min">Min amount ($, optional)</Label>
            <Input id="rule-min" type="number" min="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rule-max">Max amount ($, optional)</Label>
            <Input id="rule-max" type="number" min="0" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={limitToAccount}
              onChange={(e) => setLimitToAccount(e.target.checked)}
            />
            Only apply to one account
          </label>
          {limitToAccount && (
            <Select
              value={accountId ?? ''}
              onChange={(e) => setAccountId(e.target.value === '' ? null : Number(e.target.value))}
              aria-label="Account"
            >
              <option value="">Choose account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>File matching transactions into</Label>
          <BucketSelect buckets={buckets} value={bucketId} onChange={setBucketId} nullLabel="Choose bucket…" />
        </div>

        <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
          When several rules match, the one with the most criteria wins; ties go to the longer
          keyword, then the newest rule. Saving also applies this rule to existing{' '}
          <em>uncategorized</em> transactions.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || bucketId == null || !keyword.trim()}>
            Save rule
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
