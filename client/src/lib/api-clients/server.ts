import type { ServerConfig } from '@/types';

/**
 * Thin wrapper for the local bank-sync proxy (server/). These calls carry no
 * secrets — the proxy adds cert/keys/secrets from its own .env.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, init);
  } catch {
    throw new Error('Cannot reach the local server — is `npm run dev` running at the repo root?');
  }
  if (!res.ok) {
    let message = `Server error ${res.status}`;
    try {
      message = ((await res.json()) as { error?: string }).error ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const getServerConfig = () => api<ServerConfig>('/config');

export async function serverIsUp(): Promise<boolean> {
  try {
    await api('/health');
    return true;
  } catch {
    return false;
  }
}
