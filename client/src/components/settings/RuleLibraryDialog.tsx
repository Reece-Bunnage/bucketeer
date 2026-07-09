import { useState } from 'react';
import { addRulePacks, suggestedPath, RULE_LIBRARY } from '@/lib/db/ruleLibrary';
import type { Bucket } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { BucketSelect } from '@/components/buckets/BucketSelect';

interface RuleLibraryDialogProps {
  buckets: Bucket[];
  onClose: () => void;
  onDone: (message: string) => void;
}

/**
 * "Add common rules": check the packs you want (phone, car, subscriptions,
 * groceries, Amazon, clothing…). Each pack files its merchants into a
 * suggested bucket — created automatically — or any bucket you pick instead.
 */
export function RuleLibraryDialog({ buckets, onClose, onDone }: RuleLibraryDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(RULE_LIBRARY.map((p) => p.id)));

  const apply = async () => {
    setSaving(true);
    const { rulesAdded, categorized } = await addRulePacks(
      RULE_LIBRARY.filter((p) => selected.has(p.id)).map((pack) => ({
        pack,
        bucketId: overrides[pack.id] ?? null,
      }))
    );
    onDone(
      `✅ Added ${rulesAdded} rules${
        categorized > 0 ? ` and categorized ${categorized} existing transactions` : ''
      }. You can edit or delete any of them below.`
    );
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="Add common rules">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Each pack auto-files well-known merchants into a bucket. Suggested buckets are created
            for you, or pick your own per pack.
          </p>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={selectAll}>
            Select all
          </Button>
        </div>

        <div className="space-y-3">
          {RULE_LIBRARY.map((pack) => {
            const on = selected.has(pack.id);
            return (
              <div key={pack.id} className="rounded-md border p-3">
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={on} onChange={() => toggle(pack.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="text-sm font-medium">{pack.label}</span>
                    <span className="block truncate text-xs text-muted-foreground" title={pack.keywords.join(', ')}>
                      {pack.keywords.slice(0, 6).join(', ')}
                      {pack.keywords.length > 6 && ` +${pack.keywords.length - 6} more`}
                    </span>
                  </span>
                </label>
                {on && (
                  <div className="mt-2 flex items-center gap-2 pl-6">
                    <span className="shrink-0 text-xs text-muted-foreground">File into:</span>
                    <BucketSelect
                      buckets={buckets}
                      value={overrides[pack.id] ?? null}
                      onChange={(bucketId) => setOverrides((o) => ({ ...o, [pack.id]: bucketId }))}
                      nullLabel={`Suggested: ${suggestedPath(pack)} (created if needed)`}
                      className="h-8 text-xs"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={saving || selected.size === 0}>
            {saving ? 'Adding…' : `Add rules for ${selected.size || ''} pack${selected.size === 1 ? '' : 's'}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
