import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronDown, ChevronRight, Copy, Lightbulb, Pencil, Plus, Trash2 } from 'lucide-react';
import { db } from '@/lib/db/db';
import { createStarterBuckets } from '@/lib/db/seed';
import { ACCENTS, BUCKET_COLOR_PALETTE, updatePrefs, usePrefs } from '@/lib/prefs';
import { cn } from '@/lib/utils';
import { useAllTransactions, useBuckets, useCurrentMonthTransactions } from '@/hooks/useData';
import { bucketSpendTree, monthWeeks, subtreeIds, weeklySpend, type WeekSegment } from '@/lib/analytics';
import { fmtUsd, fmtUsdExact } from '@/lib/utils';
import type { Bucket } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BucketSelect } from './BucketSelect';
import { AddBucketDialog } from './AddBucketDialog';
import { SplitWeeksDialog } from './SplitWeeksDialog';
import { SuggestBudgetsDialog } from './SuggestBudgetsDialog';

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

/** Slim spent-vs-budget fill bar (amber when over; icon/text badges carry the state too). */
function Bar({ spent, limit, color, over }: { spent: number; limit: number | null; color?: string | null; over: boolean }) {
  const prefs = usePrefs();
  if (limit == null || limit <= 0) return null;
  const pct = Math.min(100, (spent / limit) * 100);
  const fill = over ? '#b45309' : color ?? ACCENTS[prefs.accent]?.chart ?? ACCENTS.blue.chart;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: fill }} />
    </div>
  );
}

/**
 * Weekly view: one mini bar per calendar week (Sun–Sat). With a monthly
 * limit, each week's fill is measured against its prorated share
 * (limit × days-in-week ÷ days-in-month) and over-weeks go amber + ⚠.
 * Without a limit, bars scale to the bucket's biggest week — pure
 * week-to-week comparison.
 */
function WeekBars({
  amounts,
  segments,
  monthlyLimit,
  color,
}: {
  amounts: number[];
  segments: WeekSegment[];
  monthlyLimit: number | null;
  color?: string | null;
}) {
  const prefs = usePrefs();
  const fmt = prefs.exactCents ? fmtUsdExact : fmtUsd;
  const daysInMonth = segments.reduce((sum, s) => sum + s.days, 0);
  const maxAmount = Math.max(...amounts, 1);
  const baseFill = color ?? ACCENTS[prefs.accent]?.chart ?? ACCENTS.blue.chart;

  return (
    <div className="flex gap-2">
      {segments.map((seg, i) => {
        const weekBudget = monthlyLimit != null ? (monthlyLimit * seg.days) / daysInMonth : null;
        const over = weekBudget != null && amounts[i] > weekBudget;
        const pct =
          weekBudget != null && weekBudget > 0
            ? Math.min(100, (amounts[i] / weekBudget) * 100)
            : (amounts[i] / maxAmount) * 100;
        return (
          <div key={seg.start} className="min-w-0 flex-1" title={weekBudget != null ? `${seg.label}: ${fmt(amounts[i])} of ~${fmt(weekBudget)}` : `${seg.label}: ${fmt(amounts[i])}`}>
            <p className={cn('truncate text-[10px] leading-4', seg.current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {seg.label}
              {seg.current && ' · now'}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: over ? '#b45309' : baseFill }}
              />
            </div>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {fmt(amounts[i])}
              {over && <span title="Over this week's share of the budget"> ⚠</span>}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** Click-to-edit monthly limit — Enter/blur saves, Escape cancels. */
function InlineLimit({ bucket }: { bucket: Bucket }) {
  const prefs = usePrefs();
  const fmt = prefs.exactCents ? fmtUsdExact : fmtUsd;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  const save = async () => {
    const n = value.trim() === '' ? null : Math.abs(Number(value)) || null;
    await db.buckets.update(bucket.id!, { monthlyLimit: n });
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        type="number"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void save();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="inline-block h-7 w-24 text-xs"
        aria-label={`Monthly budget for ${bucket.name}`}
      />
    );
  }
  return (
    <button
      type="button"
      title="Click to edit this bucket's monthly budget"
      onClick={() => {
        setValue(bucket.monthlyLimit != null ? String(bucket.monthlyLimit) : '');
        setEditing(true);
      }}
      className="rounded px-0.5 tabular-nums text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
    >
      {bucket.monthlyLimit != null ? `${fmt(bucket.monthlyLimit)}/mo` : 'Set budget'}
    </button>
  );
}

export function BucketManager() {
  const buckets = useBuckets() ?? [];
  const monthTxs = useCurrentMonthTransactions() ?? [];
  const allTxs = useAllTransactions() ?? [];
  const prefs = usePrefs();
  const fmt = prefs.exactCents ? fmtUsdExact : fmtUsd;
  const tree = bucketSpendTree(buckets, monthTxs);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleting, setDeleting] = useState<Bucket | null>(null);
  const [duplicating, setDuplicating] = useState<Bucket | null>(null);
  const [splitting, setSplitting] = useState<Bucket | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [query, setQuery] = useState('');

  const totals = tree.reduce(
    (acc, n) => {
      acc.spent += n.spent;
      if (n.limit != null) acc.budget += n.limit;
      return acc;
    },
    { spent: 0, budget: 0 }
  );

  // Search: a parent shows if it matches (all children kept) or any child matches.
  const q = query.trim().toLowerCase();
  const matches = (name: string) => name.toLowerCase().includes(q);
  const visibleTree =
    q === ''
      ? tree
      : tree
          .map((p) =>
            matches(p.bucket.name) ? p : { ...p, children: p.children.filter((c) => matches(c.bucket.name)) }
          )
          .filter((p) => matches(p.bucket.name) || p.children.length > 0);

  const weekly = prefs.bucketsView === 'weekly';
  const segments = monthWeeks();

  const collapsed = new Set(prefs.collapsedBuckets);
  const toggleCollapse = (id: number) =>
    updatePrefs({
      collapsedBuckets: collapsed.has(id)
        ? prefs.collapsedBuckets.filter((x) => x !== id)
        : [...prefs.collapsedBuckets, id],
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Buckets</h1>
          <p className="text-sm text-muted-foreground">
            Nested spending categories with optional monthly budgets. Parents roll up child spending.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border p-0.5" role="group" aria-label="Bucket view">
            {(['monthly', 'weekly'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => updatePrefs({ bucketsView: view })}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                  prefs.bucketsView === view ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-pressed={prefs.bucketsView === view}
              >
                {view}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => setSuggesting(true)}>
            <Lightbulb className="h-4 w-4" /> Suggest budgets
          </Button>
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> New bucket
          </Button>
        </div>
      </div>

      {tree.length > 0 && (
        <Card>
          <CardContent className="space-y-2 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {fmt(totals.spent)} spent
                {totals.budget > 0 && (
                  <>
                    {' '}of {fmt(totals.budget)} budgeted · {fmt(Math.max(0, totals.budget - totals.spent))} left
                  </>
                )}
              </span>
            </div>
            {weekly ? (
              <WeekBars
                amounts={weeklySpend(null, monthTxs, segments)}
                segments={segments}
                monthlyLimit={totals.budget > 0 ? totals.budget : null}
                color={null}
              />
            ) : (
              <Bar
                spent={totals.spent}
                limit={totals.budget > 0 ? totals.budget : null}
                color={null}
                over={totals.budget > 0 && totals.spent > totals.budget}
              />
            )}
          </CardContent>
        </Card>
      )}

      {buckets.length > 5 && (
        <Input
          placeholder="Search buckets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
          aria-label="Search buckets"
        />
      )}

      {tree.length === 0 && (
        <Card>
          <CardContent className="space-y-3 py-8 text-center text-sm text-muted-foreground">
            <p>
              No buckets yet. You can create your own, or start from a ready-made set (Food, Housing,
              Car &amp; Transport…) and rename/delete to taste.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="secondary" onClick={() => createStarterBuckets()}>
                <Plus className="h-4 w-4" /> Create starter buckets
              </Button>
              <Button variant="outline" onClick={() => setAdding(true)}>
                Pick from the full list
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {visibleTree.map((parent) => (
        <Card key={parent.bucket.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="min-w-0">
              <CardTitle>
                <ColorDot color={parent.bucket.color} />
                <Link
                  to={`/transactions?bucket=${parent.bucket.id}`}
                  className="hover:underline"
                  title={`View ${parent.bucket.name} transactions`}
                >
                  {parent.bucket.name}
                </Link>
              </CardTitle>
              <CardDescription>
                {fmt(parent.spent)} spent this month
                {parent.limit != null && parent.childLimit != null && (
                  <>
                    {' '}of {fmt(parent.limit)} budget
                    {parent.ownLimit != null && (
                      <> ({fmt(parent.ownLimit)} own + {fmt(parent.childLimit)} from sub-buckets)</>
                    )}
                    {parent.ownLimit == null && <> (from sub-buckets)</>}
                  </>
                )}
                <span className="ml-2">
                  <InlineLimit bucket={parent.bucket} />
                </span>
                {parent.over && (
                  <Badge variant="warning" className="ml-2">
                    over budget
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-1">
              {parent.children.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={collapsed.has(parent.bucket.id!) ? 'Expand sub-buckets' : 'Collapse sub-buckets'}
                  onClick={() => toggleCollapse(parent.bucket.id!)}
                >
                  {collapsed.has(parent.bucket.id!) ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
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
                aria-label={`Split ${parent.bucket.name} into weeks`}
                title="Split into weekly sub-buckets (Week 1–4)"
                onClick={() => setSplitting(parent.bucket)}
              >
                <CalendarDays className="h-3.5 w-3.5" />
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
          {(parent.limit != null || parent.children.length > 0 || weekly) && (
          <CardContent>
            {weekly ? (
              <WeekBars
                amounts={weeklySpend(subtreeIds(parent), monthTxs, segments)}
                segments={segments}
                monthlyLimit={parent.limit}
                color={parent.bucket.color}
              />
            ) : (
              <Bar spent={parent.spent} limit={parent.limit} color={parent.bucket.color} over={parent.over} />
            )}
            {parent.children.length > 0 && (!collapsed.has(parent.bucket.id!) || q !== '') && (
              <ul className={cn('divide-y', parent.limit != null && 'mt-3')}>
                {parent.children.map((child) => (
                  <li key={child.bucket.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      <ColorDot color={child.bucket.color} />
                      <Link
                        to={`/transactions?bucket=${child.bucket.id}`}
                        className="hover:underline"
                        title={`View ${child.bucket.name} transactions`}
                      >
                        {child.bucket.name}
                      </Link>
                      {child.over && (
                        <Badge variant="warning" className="ml-2">
                          over budget
                        </Badge>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums text-muted-foreground">{fmt(child.spent)} /</span>
                      <InlineLimit bucket={child.bucket} />
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
                    </div>
                    <div className="mt-1.5">
                      {weekly ? (
                        <WeekBars
                          amounts={weeklySpend(subtreeIds(child), monthTxs, segments)}
                          segments={segments}
                          monthlyLimit={child.limit}
                          color={child.bucket.color}
                        />
                      ) : (
                        <Bar spent={child.spent} limit={child.limit} color={child.bucket.color} over={child.over} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          )}
        </Card>
      ))}

      {q !== '' && visibleTree.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">No buckets match "{query}".</p>
      )}

      {adding && (
        <AddBucketDialog
          buckets={buckets}
          onClose={() => setAdding(false)}
          onCustom={() => {
            setAdding(false);
            setEditing({ defaultParentId: null });
          }}
        />
      )}
      {editing && <BucketFormDialog state={editing} buckets={buckets} onClose={() => setEditing(null)} />}
      {splitting && (
        <SplitWeeksDialog bucket={splitting} buckets={buckets} onClose={() => setSplitting(null)} />
      )}
      {suggesting && (
        <SuggestBudgetsDialog buckets={buckets} transactions={allTxs} onClose={() => setSuggesting(false)} />
      )}
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
