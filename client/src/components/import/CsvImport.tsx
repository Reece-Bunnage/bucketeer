import { useMemo, useState } from 'react';
import { db } from '@/lib/db/db';
import { useAccounts } from '@/hooks/useData';
import {
  detectColumns,
  mappingIsComplete,
  parseCsv,
  rowsToTransactions,
  type ColumnMapping,
  type ParsedCsv,
} from '@/lib/csv-parser';
import { ingestTransactions, type IngestResult } from '@/lib/db/ingest';
import { fmtUsdExact } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

/**
 * Fallback CSV import for banks Teller/Plaid don't cover. Auto-detects the
 * column layout; when it guesses wrong the user fixes the mapping manually
 * before importing. Imported rows run through the same rules engine as
 * live-synced transactions (via ingestTransactions).
 */
export function CsvImport() {
  const accounts = useAccounts() ?? [];
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [accountChoice, setAccountChoice] = useState<string>('new');
  const [newAccountName, setNewAccountName] = useState('');
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setResult(null);
    setError(null);
    try {
      const p = parseCsv(await file.text());
      if (p.headers.length < 2 || p.rows.length === 0) {
        setError('That file doesn\'t look like a CSV with a header row and data rows.');
        return;
      }
      setParsed(p);
      setFileName(file.name);
      setMapping(detectColumns(p.headers));
      if (!newAccountName) setNewAccountName(file.name.replace(/\.csv$/i, ''));
    } catch {
      setError('Could not read that file.');
    }
  };

  const preview = useMemo(() => {
    if (!parsed || !mapping || !mappingIsComplete(mapping)) return null;
    return rowsToTransactions(parsed, mapping);
  }, [parsed, mapping]);

  const doImport = async () => {
    if (!preview || preview.ok.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      let accountId: number;
      if (accountChoice === 'new') {
        if (!newAccountName.trim()) {
          setError('Give the new account a name first.');
          setImporting(false);
          return;
        }
        accountId = await db.accounts.add({ provider: 'csv', name: newAccountName.trim() });
      } else {
        accountId = Number(accountChoice);
      }
      setResult(await ingestTransactions(accountId, preview.ok, 'csv'));
      setParsed(null);
      setMapping(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setImporting(false);
  };

  const columnSelect = (
    field: 'date' | 'description' | 'amount' | 'debit' | 'credit',
    label: string
  ) =>
    parsed &&
    mapping && (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <Select
          value={mapping[field] ?? ''}
          onChange={(e) =>
            setMapping({ ...mapping, [field]: e.target.value === '' ? null : Number(e.target.value) })
          }
        >
          <option value="">— not present —</option>
          {parsed.headers.map((h, i) => (
            <option key={i} value={i}>
              {h || `(column ${i + 1})`}
            </option>
          ))}
        </Select>
      </div>
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Import CSV statement</h1>
        <p className="text-sm text-muted-foreground">
          Fallback for banks live sync doesn't cover. Download a CSV statement from your bank's website,
          then import it here — rules categorize the transactions automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Choose a file and account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Import into account</Label>
              <Select value={accountChoice} onChange={(e) => setAccountChoice(e.target.value)}>
                <option value="new">Create a new account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
            {accountChoice === 'new' && (
              <div className="space-y-1.5">
                <Label>New account name</Label>
                <Input
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="e.g. Chase Checking"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {parsed && mapping && (
        <Card>
          <CardHeader>
            <CardTitle>2. Check the column mapping — {fileName}</CardTitle>
            <CardDescription>
              Auto-detected from the headers. Fix anything that's wrong. Use either one signed Amount
              column, or separate Debit/Credit columns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {columnSelect('date', 'Date column')}
              {columnSelect('description', 'Description column')}
              {columnSelect('amount', 'Amount column (signed)')}
              {columnSelect('debit', 'Debit column (money out)')}
              {columnSelect('credit', 'Credit column (money in)')}
            </div>
            {mapping.amount != null && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mapping.flipSign}
                  onChange={(e) => setMapping({ ...mapping, flipSign: e.target.checked })}
                />
                Flip the sign (check this if the preview shows purchases as positive amounts)
              </label>
            )}

            {!mappingIsComplete(mapping) && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Pick at least a Date, Description, and either an Amount column or both Debit and Credit.
              </p>
            )}

            {preview && (
              <>
                <div className="text-sm">
                  <span className="font-medium">{preview.ok.length}</span> rows ready
                  {preview.skipped > 0 && (
                    <span className="text-muted-foreground"> · {preview.skipped} unparseable rows will be skipped</span>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-1.5 font-medium">Date</th>
                      <th className="py-1.5 font-medium">Description</th>
                      <th className="py-1.5 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.ok.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 tabular-nums">{r.date}</td>
                        <td className="max-w-64 truncate py-1.5">{r.description}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmtUsdExact(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button onClick={doImport} disabled={importing || preview.ok.length === 0}>
                  {importing ? 'Importing…' : `Import ${preview.ok.length} transactions`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <Card>
          <CardContent className="py-4 text-sm">
            ✅ Imported <strong>{result.added}</strong> transactions
            {result.duplicates > 0 && <> · {result.duplicates} duplicates skipped</>}
            {result.uncategorized > 0 && (
              <>
                {' '}
                · <strong>{result.uncategorized}</strong> are uncategorized — review them on the
                Transactions page and create rules so next time they file themselves.
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
