import { useEffect, useState } from 'react';
import { Landmark, RefreshCw } from 'lucide-react';
import { getServerConfig } from '@/lib/api-clients/server';
import { connectTeller, syncTellerAccount } from '@/lib/api-clients/teller';
import { connectPlaid, syncPlaidAccount } from '@/lib/api-clients/plaid';
import { useAccounts } from '@/hooks/useData';
import type { Account, ServerConfig } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Connections() {
  const accounts = useAccounts() ?? [];
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);

  useEffect(() => {
    getServerConfig()
      .then(setConfig)
      .catch((err) => setServerError(err.message));
  }, []);

  const onConnectResult = (result: { accounts: number } | { error: string }) => {
    setStatus('error' in result ? `⚠ ${result.error}` : `✅ Connected ${result.accounts} account(s) and synced.`);
  };

  const sync = async (account: Account) => {
    setSyncing(account.id!);
    setStatus(null);
    try {
      if (account.provider === 'teller') await syncTellerAccount(account);
      else if (account.provider === 'plaid') await syncPlaidAccount(account);
      setStatus(`✅ Synced ${account.name}.`);
    } catch (err) {
      setStatus(`⚠ ${err instanceof Error ? err.message : String(err)}`);
    }
    setSyncing(null);
  };

  const synced = accounts.filter((a) => a.provider !== 'csv');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank connections</CardTitle>
        <CardDescription>
          Live sync via Teller (and optionally Plaid). Access tokens stay in this browser's local
          database; the local server only proxies requests using the keys in server/.env.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {serverError && (
          <p className="text-sm text-destructive">
            Local server unreachable: {serverError}
          </p>
        )}
        {config?.csvOnly && (
          <p className="text-sm text-muted-foreground">
            Running in CSV-only mode (CSV_ONLY=true in server/.env) — live sync is disabled.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!config || config.csvOnly || !config.teller.applicationId}
            onClick={() => config && connectTeller(config, onConnectResult)}
          >
            <Landmark className="h-4 w-4" /> Connect a bank (Teller)
          </Button>
          {config?.plaidEnabled && (
            <Button variant="secondary" onClick={() => connectPlaid(onConnectResult)}>
              <Landmark className="h-4 w-4" /> Connect via Plaid
            </Button>
          )}
        </div>
        {config && !config.csvOnly && config.teller.environment === 'sandbox' && (
          <p className="text-xs text-muted-foreground">
            Teller is in <Badge variant="outline">sandbox</Badge> mode — you'll see fake test banks.
            Switch TELLER_ENVIRONMENT in server/.env when you're ready for real accounts.
          </p>
        )}

        {synced.length > 0 && (
          <ul className="divide-y">
            {synced.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {a.name}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {a.institution ?? a.provider} · last synced{' '}
                    {a.lastSyncedAt ? new Date(a.lastSyncedAt).toLocaleString() : 'never'}
                  </span>
                </span>
                <Button variant="outline" size="sm" disabled={syncing !== null} onClick={() => sync(a)}>
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing === a.id ? 'animate-spin' : ''}`} />
                  {syncing === a.id ? 'Syncing…' : 'Sync now'}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {status && <p className="text-sm">{status}</p>}
      </CardContent>
    </Card>
  );
}
