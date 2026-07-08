import { getLastBackupDate } from './index';

/**
 * SCAFFOLDING for the backup-reminder banner (deliberately not wired into the
 * UI yet — see the agent brief). Planned behavior: show a dismissible banner
 * when the last backup is more than `staleDays` old, or after a large
 * import/sync. The `lastBackupDate` meta key is already written on every
 * export, so a future banner component only needs to call this.
 */
export async function isBackupStale(staleDays = 7): Promise<boolean> {
  const last = await getLastBackupDate();
  if (!last) return true;
  const ageMs = Date.now() - new Date(last).getTime();
  return ageMs > staleDays * 24 * 60 * 60 * 1000;
}
