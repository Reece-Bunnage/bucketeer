import { ACCENTS, updatePrefs, usePrefs, type AccentName, type Prefs } from '@/lib/prefs';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

function Toggle({ label, field, prefs }: { label: string; field: keyof Prefs; prefs: Prefs }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={Boolean(prefs[field])}
        onChange={(e) => updatePrefs({ [field]: e.target.checked })}
      />
      {label}
    </label>
  );
}

export function AppearanceSettings() {
  const prefs = usePrefs();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance & dashboard</CardTitle>
        <CardDescription>
          Make it yours — theme, colors, chart styles, and which cards the dashboard shows. Saved
          locally and included in backups. Buckets can each get their own chart color too (edit a
          bucket on the Buckets page).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pref-theme">Theme</Label>
            <Select
              id="pref-theme"
              value={prefs.theme}
              onChange={(e) => updatePrefs({ theme: e.target.value as Prefs['theme'] })}
            >
              <option value="system">Match my computer (system)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Accent color</Label>
            <div className="flex items-center gap-2 pt-1">
              {(Object.keys(ACCENTS) as AccentName[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  title={ACCENTS[name].label}
                  aria-label={`Accent: ${ACCENTS[name].label}`}
                  onClick={() => updatePrefs({ accent: name })}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                    prefs.accent === name ? 'border-foreground' : 'border-transparent'
                  )}
                  style={{ backgroundColor: ACCENTS[name].chart }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="pref-budget-style">Budget chart style</Label>
            <Select
              id="pref-budget-style"
              value={prefs.budgetChartStyle}
              onChange={(e) => updatePrefs({ budgetChartStyle: e.target.value as Prefs['budgetChartStyle'] })}
            >
              <option value="bars">Bar chart</option>
              <option value="progress">Progress bars</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pref-cashflow-style">Cash flow style</Label>
            <Select
              id="pref-cashflow-style"
              value={prefs.cashFlowStyle}
              onChange={(e) => updatePrefs({ cashFlowStyle: e.target.value as Prefs['cashFlowStyle'] })}
            >
              <option value="bars">Bars</option>
              <option value="area">Area</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pref-cashflow-months">Cash flow range</Label>
            <Select
              id="pref-cashflow-months"
              value={prefs.cashFlowMonths}
              onChange={(e) => updatePrefs({ cashFlowMonths: Number(e.target.value) as Prefs['cashFlowMonths'] })}
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Dashboard cards</Label>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
            <Toggle label="Balance across accounts" field="showNetWorth" prefs={prefs} />
            <Toggle label="Cash flow" field="showCashFlow" prefs={prefs} />
            <Toggle label="Sub-bucket breakdown table" field="showChildBreakdown" prefs={prefs} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Numbers & tables</Label>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
            <Toggle label="Show cents (instead of rounded dollars)" field="exactCents" prefs={prefs} />
            <Toggle label="Compact tables (denser rows)" field="compactTables" prefs={prefs} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
