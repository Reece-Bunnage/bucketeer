import { useState } from 'react';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { db } from '@/lib/db/db';
import { createStarterBuckets } from '@/lib/db/seed';
import { BUCKET_COLOR_PALETTE } from '@/lib/prefs';
import { cn } from '@/lib/utils';
import { useBuckets, useCurrentMonthTransactions } from '@/hooks/useData';
import { bucketSpendTree } from '@/lib/analytics';
import { fmtUsd } from '@/lib/utils';
import type { Bucket } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BucketSelect } from './BucketSelect';

interface EditState {
  bucket?: Bucket; // undefined = creating
  defaultParentId: number | null;
}

function ColorDot({ color }: { color?: string | null }) {
  if (!color) return null;
  return (
    <span
      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-baseline"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

export function BucketManager() {
  const buckets = useBuckets() ?? [];
  const monthTxs = useCurrentMonthTransactions() ?? [];
  const tree = bucketSpendTree(buckets, monthTxs);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleting, setDeleting] = useState<Bucket | null>(null);
  const [duplicating, setDuplicating] = useState<Bucket | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Buckets</h1>
          <p className="text-sm text-muted-foreground">
            Nested spending categories with optional monthly budgets. Parents roll up child spending.
          </p>
        </div>
        <Button onClick={() => setEditing({ defaultParentId: null })}>
          <Plus className="h-4 w-4" /> New bucket
        </Button>
      </div>

      {tree.length === 0 && (
        <Card>
          <CardContent className="space-y-3 py-8 text-center text-sm text-muted-foreground">
            <p>
              No buckets yet. You can create your own, or start from a ready-made set (Food, Housing,
              Car &amp; Transport…) and rename/delete to taste.
            </p>
            <Button variant="secondary" onClick={() => createStarterBuckets()}>
              <Plus className="h-4 w-4" /> Create starter buckets
            </Button>
          </CardContent>
        </Card>
      )}

      {tree.map((parent) => (
        <Card key={parent.bucket.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>
                <ColorDot color={parent.bucket.color} />
                {parent.bucket.name}
              </CardTitle>
              <CardDescription>
                {fmtUsd(parent.spent)} spent this month
                {parent.limit != null && (
                  <>
                    {' '}of {fmtUsd(parent.limit)} budget
                    {parent.childLimit != null && parent.ownLimit != null && (
                      <> ({fmtUsd(parent.ownLimit)} own + {fmtUsd(parent.childLimit)} from sub-buckets)</>
                    )}
                    {parent.childLimit != null && parent.ownLimit == null && <> (from sub-buckets)</>}
                  </>
                )}
                {parent.over && (
                  <Badge variant="warning" className="ml-2">
                    over budget
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing({ defaultParentId: parent.bucket.id! })}
              >
                <Plus className="h-3.5 w-3.5" /> Sub-bucket
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${parent.bucket.name}`}
                onClick={() => setEditing({ bucket: parent.bucket, defaultParentId: null })}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Duplicate ${parent.bucket.name}`}
                title="Duplicate (make numbered copies)"
                onClick={() => setDuplicating(parent.bucket)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${parent.bucket.name}`}
                onClick={() => setDeleting(parent.bucket)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          {parent.children.length > 0 && (
            <CardContent>
              <ul className="divide-y">
                {parent.children.map((child) => (
                  <li key={child.bucket.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      <ColorDot color={child.bucket.color} />
                      {child.bucket.name}
                      {child.over && (
                        <Badge variant="warning" className="ml-2">
                          over budget
                        </Badge>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums text-muted-foreground">
                        {fmtUsd(child.spent)}
                        {child.limit != null && <> / {fmtUsd(child.limit)}</>}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${child.bucket.name}`}
                        onClick={() => setEditing({ bucket: child.bucket, defaultParentId: child.bucket.parentId })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Duplicate ${child.bucket.name}`}
                        title="Duplicate (make numbered copies)"
                        onClick={() => setDuplicating(child.bucket)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${child.bucket.name}`}
                        onClick={() => setDeleting(child.bucket)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      ))}

      {editing && <BucketFormDialog state={editing} buckets={buckets} onClose={() => setEditing(null)} />}
      {deleting && <DeleteBucketDialog bucket={deleting} buckets={buckets} onClose={() => setDeleting(null)} />}
      {duplicating && (
        <DuplicateBucketDialog bucket={duplicating} buckets={buckets} onClose={() => setDuplicating(null)} />
      )}
    </div>
  );
}

function BucketFormDialog({
  state,
  buckets,
  onClose,
}: {
  state: EditState;
  buckets: Bucket[];
  onClose: () => void;
}) {
  const { bucket } = state;
  const [name, setName] = useState(bucket?.name ?? '');
  const [limit, setLimit] = useState(bucket?.monthlyLimit != null ? String(bucket.monthlyLimit) : '');
  const [parentId, setParentId] = useState<number | null>(bucket?.parentId ?? state.defaultParentId);
  const [color, setColor] = useState<string | null>(bucket?.color ?? null);
  const parents = buckets.filter((b) => b.parentId == null && b.id !== bucket?.id);
  // A bucket that has children can't itself become a child (2-level UI).
  const hasChildren = bucket != null && buckets.some((b) => b.parentId === bucket.id);

  const save = async () => {
    if (!name.trim()) return;
    const record: Bucket = {
      ...(bucket ?? {}),
      name: name.trim(),
      parentId: hasChildren ? null : parentId,
      monthlyLimit: limit.trim() === '' ? null : Math.abs(Number(limit)) || null,
      color,
    };
    if (bucket?.id != null) await db.buckets.put({ ...record, id: bucket.id });
    else await db.buckets.add(record);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={bucket ? `Edit "${bucket.name}"` : 'New bucket'}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="bucket-name">Name</Label>
          <Input id="bucket-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Groceries" autoFocus />
        </div>
        {!hasChildren && (
          <div className="space-y-1.5">
            <Label htmlFor="bucket-parent">Parent bucket</Label>
            <Select
              id="bucket-parent"
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">None (top-level)</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Chart color (optional)</Label>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setColor(null)}
              className={cn(
                'h-7 rounded-full border px-2 text-xs',
                color == null ? 'border-foreground font-medium' : 'border-input text-muted-foreground'
              )}
            >
              Auto
            </button>
            {BUCKET_COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className={cn(
                  'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                  color === c ? 'border-foreground' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bucket-limit">Monthly budget limit ($, optional)</Label>
          <Input
            id="bucket-limit"
            type="number"
            min="0"
            step="1"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="e.g. 400"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/**
 * Make numbered copies of a bucket — e.g. duplicate "Week 1" under Groceries
 * into "Week 2/3/4" in one step. Copies keep the same parent and monthly
 * limit (and a parent's sub-buckets are copied along with it). Names already
 * taken next to this bucket are skipped, so it's safe to over-shoot the count.
 */
function DuplicateBucketDialog({
  bucket,
  buckets,
  onClose,
}: {
  bucket: Bucket;
  buckets: Bucket[];
  onClose: () => void;
}) {
  // "Week 1" → base "Week", so duplicating produces Week 1..N, not "Week 1 1".
  const trailingNumber = bucket.name.match(/^(.*?)\s*\d+$/);
  const [baseName, setBaseName] = useState((trailingNumber ? trailingNumber[1] : bucket.name).trim());
  const [count, setCount] = useState('4');

  const siblings = new Set(
    buckets.filter((b) => b.parentId === bucket.parentId).map((b) => b.name.toLowerCase())
  );
  const children = buckets.filter((b) => b.parentId === bucket.id);
  const n = Math.min(Math.max(Math.floor(Number(count)) || 0, 0), 24);
  const planned = Array.from({ length: n }, (_, i) => `${baseName.trim()} ${i + 1}`);
  const toCreate = planned.filter((name) => name.trim() !== '' && !siblings.has(name.toLowerCase()));

  const confirm = async () => {
    for (const name of toCreate) {
      const newId = await db.buckets.add({
        name,
        parentId: bucket.parentId,
        monthlyLimit: bucket.monthlyLimit,
        color: bucket.color,
      });
      for (const child of children) {
        await db.buckets.add({
          name: child.name,
          parentId: newId,
          monthlyLimit: child.monthlyLimit,
          color: child.color,
        });
      }
    }
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={`Duplicate "${bucket.name}"`}>
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Creates numbered buckets next to this one, each with the same monthly budget
          {children.length > 0 && <> and the same {children.length} sub-bucket{children.length === 1 ? '' : 's'}</>}.
          Great for things like weekly grocery budgets (Week 1–4).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dup-base">Base name</Label>
            <Input id="dup-base" value={baseName} onChange={(e) => setBaseName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dup-count">Number them 1 through…</Label>
            <Input
              id="dup-count"
              type="number"
              min="1"
              max="24"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
        </div>
        <p>
          {toCreate.length > 0 ? (
            <>
              Will create: <strong>{toCreate.join(', ')}</strong>
              {toCreate.length < planned.length && (
                <span className="text-muted-foreground"> (the rest already exist and are skipped)</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">
              Nothing to create — all of those names already exist here.
            </span>
          )}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={toCreate.length === 0}>
            Create {toCreate.length || ''} bucket{toCreate.length === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/**
 * Deleting a bucket never silently orphans transactions: the user must pick
 * where existing transactions go (another bucket, or Uncategorized).
 * Deleting a parent also deletes its children; rules pointing at deleted
 * buckets are removed too.
 */
function DeleteBucketDialog({
  bucket,
  buckets,
  onClose,
}: {
  bucket: Bucket;
  buckets: Bucket[];
  onClose: () => void;
}) {
  const [target, setTarget] = useState<number | null>(null);
  const childIds = buckets.filter((b) => b.parentId === bucket.id).map((b) => b.id!);
  const affectedIds = [bucket.id!, ...childIds];
  const selectable = buckets.filter((b) => b.id != null && !affectedIds.includes(b.id));

  const confirm = async () => {
    await db.transaction('rw', [db.transactions, db.buckets, db.rules], async () => {
      await db.transactions.where('bucketId').anyOf(affectedIds).modify({ bucketId: target });
      await db.rules.where('bucketId').anyOf(affectedIds).delete();
      await db.buckets.bulkDelete(affectedIds);
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={`Delete "${bucket.name}"?`}>
      <div className="space-y-4 text-sm">
        <p>
          {childIds.length > 0 && (
            <>
              This also deletes its {childIds.length} sub-bucket{childIds.length === 1 ? '' : 's'}.{' '}
            </>
          )}
          Transactions in {childIds.length > 0 ? 'these buckets' : 'this bucket'} will be moved to the
          bucket you pick below (rules pointing here are deleted).
        </p>
        <div className="space-y-1.5">
          <Label>Move existing transactions to</Label>
          <BucketSelect buckets={selectable} value={target} onChange={setTarget} nullLabel="Uncategorized" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm}>
            Delete bucket
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
