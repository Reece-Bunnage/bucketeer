import { Select } from '@/components/ui/select';
import type { Bucket } from '@/types';

interface BucketSelectProps {
  buckets: Bucket[];
  value: number | null;
  onChange: (bucketId: number | null) => void;
  /** Label for the null option (default "Uncategorized"). */
  nullLabel?: string;
  className?: string;
}

/** Bucket picker with parents as optgroups (2-level hierarchy). */
export function BucketSelect({ buckets, value, onChange, nullLabel = 'Uncategorized', className }: BucketSelectProps) {
  const parents = buckets.filter((b) => b.parentId == null);
  return (
    <Select
      className={className}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    >
      <option value="">{nullLabel}</option>
      {parents.map((p) => {
        const children = buckets.filter((c) => c.parentId === p.id);
        return (
          <optgroup key={p.id} label={p.name}>
            <option value={p.id}>{p.name}</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {p.name} › {c.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </Select>
  );
}

/** "Food › Groceries" style display name for a bucket id. */
export function bucketPath(buckets: Bucket[], bucketId: number | null): string {
  if (bucketId == null) return 'Uncategorized';
  const bucket = buckets.find((b) => b.id === bucketId);
  if (!bucket) return 'Uncategorized';
  const parent = bucket.parentId != null ? buckets.find((b) => b.id === bucket.parentId) : null;
  return parent ? `${parent.name} › ${bucket.name}` : bucket.name;
}
