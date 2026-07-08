/**
 * Fallback CSV statement parser. Banks export wildly different CSVs, so this
 * (a) parses quoted CSV safely, (b) auto-detects common column names and date
 * formats, and (c) exposes the mapping so the UI can let the user fix it
 * manually when auto-detection guesses wrong.
 */

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/** Minimal RFC-4180-ish parser: handles quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);

  const [headers = [], ...body] = rows;
  return { headers: headers.map((h) => h.trim()), rows: body };
}

export interface ColumnMapping {
  date: number | null;
  description: number | null;
  /** Single signed-amount column… */
  amount: number | null;
  /** …or separate debit/credit columns (used when `amount` is null). */
  debit: number | null;
  credit: number | null;
  /** Some banks export spending as positive numbers; true flips the sign. */
  flipSign: boolean;
}

const HEADER_GUESSES: Record<keyof Omit<ColumnMapping, 'flipSign'>, string[]> = {
  date: ['date', 'transaction date', 'posted date', 'post date', 'posting date'],
  description: ['description', 'merchant', 'name', 'payee', 'memo', 'details', 'transaction'],
  amount: ['amount', 'transaction amount', 'amount (usd)'],
  debit: ['debit', 'withdrawal', 'withdrawals', 'money out', 'outflow'],
  credit: ['credit', 'deposit', 'deposits', 'money in', 'inflow'],
};

/** Guess which column is which from header names. Fields it can't find are null. */
export function detectColumns(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const find = (candidates: string[]) => {
    for (const c of candidates) {
      const exact = lower.indexOf(c);
      if (exact !== -1) return exact;
    }
    for (const c of candidates) {
      const partial = lower.findIndex((h) => h.includes(c));
      if (partial !== -1) return partial;
    }
    return null;
  };
  const mapping: ColumnMapping = {
    date: find(HEADER_GUESSES.date),
    description: find(HEADER_GUESSES.description),
    amount: find(HEADER_GUESSES.amount),
    debit: find(HEADER_GUESSES.debit),
    credit: find(HEADER_GUESSES.credit),
    flipSign: false,
  };
  // Prefer debit/credit pairs over a column that merely contains "amount".
  if (mapping.debit != null && mapping.credit != null) mapping.amount = null;
  return mapping;
}

export function mappingIsComplete(m: ColumnMapping): boolean {
  return (
    m.date != null &&
    m.description != null &&
    (m.amount != null || (m.debit != null && m.credit != null))
  );
}

/** "$1,234.56", "(45.00)" (negative), "-45.00" → number, or null if unparseable. */
export function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$,\s]/g, '');
  if (!s || isNaN(Number(s))) return null;
  const n = Number(s);
  return negative ? -Math.abs(n) : n;
}

/** Accepts YYYY-MM-DD, MM/DD/YYYY, MM/DD/YY, MM-DD-YYYY, "Jan 5 2026"… → YYYY-MM-DD. */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    // US convention: month first.
    const [, mo, day, yr] = m;
    const year = yr.length === 2 ? `20${yr}` : yr;
    return `${year}-${mo.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const t = Date.parse(s);
  if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

export interface NormalizedRow {
  date: string;
  description: string;
  amount: number; // negative = spending
}

/** Apply a mapping to parsed rows; unparseable rows are counted, not imported. */
export function rowsToTransactions(
  parsed: ParsedCsv,
  mapping: ColumnMapping
): { ok: NormalizedRow[]; skipped: number } {
  const ok: NormalizedRow[] = [];
  let skipped = 0;
  for (const row of parsed.rows) {
    const date = mapping.date != null ? parseDate(row[mapping.date] ?? '') : null;
    const description =
      mapping.description != null ? (row[mapping.description] ?? '').trim() : '';
    let amount: number | null = null;
    if (mapping.amount != null) {
      amount = parseAmount(row[mapping.amount] ?? '');
      if (amount != null && mapping.flipSign) amount = -amount;
    } else if (mapping.debit != null && mapping.credit != null) {
      const debit = parseAmount(row[mapping.debit] ?? '');
      const credit = parseAmount(row[mapping.credit] ?? '');
      if (debit != null && debit !== 0) amount = -Math.abs(debit);
      else if (credit != null && credit !== 0) amount = Math.abs(credit);
      else if (debit != null || credit != null) amount = 0;
    }
    if (!date || !description || amount == null) {
      skipped++;
      continue;
    }
    ok.push({ date, description, amount });
  }
  return { ok, skipped };
}
