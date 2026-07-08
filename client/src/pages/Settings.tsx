import { Connections } from '@/components/settings/Connections';
import { RulesManager } from '@/components/settings/RulesManager';
import { BackupSettings } from '@/components/settings/BackupSettings';

export function Settings() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Connections />
      <RulesManager />
      <BackupSettings />
    </div>
  );
}
