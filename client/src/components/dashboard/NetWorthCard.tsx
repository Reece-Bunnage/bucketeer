import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtUsdExact } from '@/lib/utils';
import type { Account } from '@/types';

/** Overall balance across connected accounts. Scales from 1 to 5+ accounts. */
export function NetWorthCard({ accounts }: { accounts: Account[] }) {
  const withBalance = accounts.filter((a) => a.balance != null);
  const total = withBalance.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance across accounts</CardTitle>
        <CardDescription>
          {withBalance.length === 0
            ? 'No synced balances yet — connect a bank in Settings.'
            : `${withBalance.length} account${withBalance.length === 1 ? '' : 's'} with a known balance`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{fmtUsdExact(total)}</p>
        <ul className="mt-4 space-y-1.5 text-sm">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2">
              <span className="truncate">
                {a.name}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {a.institution ?? a.provider}
                </span>
              </span>
              <span className="tabular-nums text-muted-foreground">
                {a.balance != null ? fmtUsdExact(a.balance) : 'no balance (CSV)'}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
