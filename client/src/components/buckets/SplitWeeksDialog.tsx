import { useState } from 'react';
import { db } from '@/lib/db/db';
import { fmtUsdExact } from '@/lib/utils';
import type { Bucket } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface SplitWeeksDialogProps {
  bucket: Bucket; // top-level (parent) bucket
  buckets: Bucket[];
  onClose: () => void;
}

/**
 * Split a parent bucket into Week 1..N sub-buckets. Weekly budgets roll up
 * into the parent's total automatically (see lib/analytics.ts), so dividing
 * the parent's current budget moves it into the weeks — the total stays the
 * same, it's just tracked week by week. Existing transactions stay on the
 * parent and keep counting toward the total.
 */
export function SplitWeeksDialog({ bucket, buckets, onClose }: SplitWeeksDialogProps) {
  const [count, setCount] = useState(4);
  const [divide, setDivide] = useState(bucket.monthlyLimit != null);

  const existing = new Set(
    buckets.filter((b) => b.parentId === bucket.id).map((b) => b.name.toLowerCase())
  );
  const names = Array.from({ length: count }, (_, i) => `Week ${i + 1}`).filter(
    (n) => !existing.has(n.toLowerCase())
  );
  const perWeek =
    divide && bucket.monthlyLimit != null ? Math.round((bucket.monthlyLimit / count) * 100) / 100 : null;

  const confirm = async () => {
    for (const name of names) {
      await db.buckets.add({
        name,
        parentId: bucket.id!,
        monthlyLimit: perWeek,
        color: bucket.color ?? null,
      });
    }
    // The budget moved into the weeks; clearing the parent's own limit keeps
    // the rolled-up total the same instead of doubling it.
    if (perWeek != null) await db.buckets.update(bucket.id!, { monthlyLimit: null });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={`Split "${bucket.name}" into weeks`}>
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Adds weekly sub-buckets under {bucket.name}. Their budgets automatically add up into{' '}
          {bucket.name}'s total, and existing transactions stay where they are — this just lets you
          budget and track week by week.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="split-count">How many weeks?</Label>
          <Select
            id="split-count"
            className="w-40"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          >
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} weeks
              </option>
            ))}
          </Select>
        </div>

        {bucket.monthlyLimit != null && (
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={divide}
              onChange={(e) => setDivide(e.target.checked)}
            />
            <span>
              Divide the current {fmtUsdExact(bucket.monthlyLimit)} budget across the weeks (
              {fmtUsdExact(Math.round((bucket.monthlyLimit / count) * 100) / 100)} each). The total
              stays the same.
            </span>
          </label>
        )}

        <p>
          Will create: <strong>{names.join(', ') || 'nothing — those weeks already exist'}</strong>
          {names.length > 0 && perWeek != null && <> at {fmtUsdExact(perWeek)} each</>}
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={names.length === 0}>
            Split into weeks
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
