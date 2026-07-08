import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FlaskConical, Trash2 } from 'lucide-react';
import { db } from '@/lib/db/db';
import { addSampleData, removeSampleData } from '@/lib/db/sampleData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SampleDataSettings() {
  const present = useLiveQuery(async () => (await db.meta.get('sampleData')) != null, []);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    const { transactions } = await addSampleData();
    setStatus(
      `✅ Added 2 demo accounts and ${transactions} transactions across the last 4 months. ` +
        'Check out the Dashboard — and note some transactions are uncategorized on purpose, ' +
        'so you can practice creating rules.'
    );
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    await removeSampleData();
    setStatus('✅ Sample data removed — demo accounts, their transactions, and demo budget limits are gone.');
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sample data</CardTitle>
        <CardDescription>
          Want to explore before connecting a bank? Add demo accounts with a few months of pretend
          transactions. Removing it later puts everything back exactly as it was — your own data is
          never touched.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {present ? (
            <Button variant="outline" disabled={busy} onClick={remove}>
              <Trash2 className="h-4 w-4" /> Remove sample data
            </Button>
          ) : (
            <Button variant="secondary" disabled={busy || present == null} onClick={add}>
              <FlaskConical className="h-4 w-4" /> Add sample data
            </Button>
          )}
        </div>
        {status && <p className="text-sm">{status}</p>}
      </CardContent>
    </Card>
  );
}
