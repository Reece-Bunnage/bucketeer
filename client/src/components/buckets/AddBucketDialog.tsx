import { useState } from 'react';
import { Check, PencilLine } from 'lucide-react';
import { db } from '@/lib/db/db';
import { BUCKET_LIBRARY } from '@/lib/db/bucketLibrary';
import { cn } from '@/lib/utils';
import type { Bucket } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

interface AddBucketDialogProps {
  buckets: Bucket[];
  onClose: () => void;
  /** "None of these fit" → open the custom bucket form instead. */
  onCustom: () => void;
}

/**
 * "New bucket" picker: choose any number of common buckets from the library
 * (parents are created automatically), or fall through to a custom bucket.
 * Buckets the user already has are hidden from the list.
 */
export function AddBucketDialog({ buckets, onClose, onCustom }: AddBucketDialogProps) {
  const existingNames = new Set(buckets.map((b) => b.name.toLowerCase()));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const key = (parent: string, child: string) => `${parent}|${child}`;
  const toggle = (k: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const groups = BUCKET_LIBRARY.map((g) => ({
    ...g,
    children: g.children.filter((c) => !existingNames.has(c.name.toLowerCase())),
  })).filter((g) => g.children.length > 0);

  const add = async () => {
    setSaving(true);
    for (const group of BUCKET_LIBRARY) {
      const chosen = group.children.filter((c) => selected.has(key(group.parent, c.name)));
      if (chosen.length === 0) continue;
      const existingParent = buckets.find(
        (b) => b.parentId == null && b.name.toLowerCase() === group.parent.toLowerCase()
      );
      const parentId =
        existingParent?.id ??
        (await db.buckets.add({ name: group.parent, parentId: null, monthlyLimit: null, color: group.color }));
      for (const child of chosen) {
        await db.buckets.add({ name: child.name, parentId, monthlyLimit: null, color: child.color });
      }
    }
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="Add buckets">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pick as many as you like — they're grouped under parent buckets that get created for you.
          You can set budgets and colors afterwards.
        </p>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You already have every bucket in the library — create a custom one below.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.parent} className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: group.color }}
                  aria-hidden
                />
                {group.parent}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.children.map((child) => {
                  const k = key(group.parent, child.name);
                  const on = selected.has(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggle(k)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors',
                        on
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input hover:bg-accent'
                      )}
                    >
                      {on && <Check className="h-3.5 w-3.5" />}
                      {child.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <Button variant="outline" onClick={onCustom}>
            <PencilLine className="h-4 w-4" /> None fit? Create a custom bucket
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={add} disabled={saving || selected.size === 0}>
              Add {selected.size || ''} bucket{selected.size === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
