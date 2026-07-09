import { useMemo, useState } from 'react';
import { db } from '@/lib/db/db';
import { suggestBudgets } from '@/lib/analytics';
import { fmtUsd } from '@/lib/utils';
import type { Bucket, Transaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { bucketPath } from './BucketSelect';

interface SuggestBudgetsDialogProps {
  buckets: Bucket[];
  transactions: Transaction[];
  onClose: () => void;
}

/**
 * Preview-and-confirm budget suggestions from spending history (average of
 * the last 3 complete months, rounded up to $10). Buckets without a limit
 * are pre-checked; buckets that already have one are opt-in. Nothing is
 * saved until Apply.
 */
export function SuggestBudgetsDialog({ buckets, transactions, onClose }: SuggestBudgetsDialogProps) {
  const suggestions = useMemo(() => suggestBudgets(buckets, transactions), [buckets, transactions]);
  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(suggestions.filter((s) => s.current == null).map((s) => s.bucket.id!))
  );
  const [saving, setSaving] = useState(false);

  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const apply = async () => {
    setSaving(true);
    for (const s of suggestions) {
      if (checked.has(s.bucket.id!)) {
        await db.buckets.update(s.bucket.id!, { monthlyLimit: s.suggested });
      }
    }
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="Suggest budgets from your history">
      <div className="space-y-4 text-sm">
        {suggestions.length === 0 ? (
          <p className="text-muted-foreground">
            Not enough history yet — suggestions come from the last 3 months of categorized spending.
            Sync or import some transactions first.
          </p>
        ) : (
          <>
            <p className="text-muted-foreground">
              Based on your average monthly spending over the last 3 months (rounded up to the nearest
              $10). Check the buckets to update — ones that already have a budget aren't touched unless
              you check them.
            </p>
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1.5 font-medium" />
                  <th className="py-1.5 font-medium">Bucket</th>
                  <th className="py-1.5 text-right font-medium">Current</th>
                  <th className="py-1.5 text-right font-medium">Suggested</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => (
                  <tr key={s.bucket.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">
                      <input
                        type="checkbox"
                        checked={checked.has(s.bucket.id!)}
                        onChange={() => toggle(s.bucket.id!)}
                        aria-label={`Apply suggestion to ${s.bucket.name}`}
                      />
                    </td>
                    <td className="max-w-48 truncate py-1.5">{bucketPath(buckets, s.bucket.id!)}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                      {s.current != null ? fmtUsd(s.current) : '—'}
                    </td>
                    <td className="py-1.5 text-right font-medium tabular-nums">{fmtUsd(s.suggested)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={saving || checked.size === 0}>
            Apply to {checked.size || ''} bucket{checked.size === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
