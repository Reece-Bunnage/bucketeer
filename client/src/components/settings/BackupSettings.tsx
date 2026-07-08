import { useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { exportBackup, getLastBackupDate, importBackup } from '@/lib/backup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function BackupSettings() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getLastBackupDate().then(setLastBackup);
  }, [status]);

  const onExport = async () => {
    await exportBackup();
    setStatus('✅ Backup downloaded. Keep it somewhere safe (e.g. your desktop or a USB drive).');
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    if (
      !window.confirm(
        'Importing a backup REPLACES everything currently in the app (accounts, transactions, buckets, rules). Continue?'
      )
    )
      return;
    try {
      const { transactions, buckets } = await importBackup(file);
      setStatus(`✅ Restored ${transactions} transactions and ${buckets} buckets.`);
    } catch (err) {
      setStatus(`⚠ ${err instanceof Error ? err.message : String(err)}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & restore</CardTitle>
        <CardDescription>
          Your data lives only in this browser's storage, which "Clear browsing data" can wipe.
          Export a JSON backup regularly — it's also how you move to a new computer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Last backup:{' '}
          {lastBackup ? new Date(lastBackup).toLocaleString() : 'never — export one now!'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onExport}>
            <Download className="h-4 w-4" /> Export Backup (JSON)
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import Backup (JSON)
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => onImportFile(e.target.files?.[0])}
          />
        </div>
        {status && <p className="text-sm">{status}</p>}
      </CardContent>
    </Card>
  );
}
