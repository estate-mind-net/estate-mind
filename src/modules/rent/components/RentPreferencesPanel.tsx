import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { RentPreferences } from '../types'

interface RentPreferencesPanelProps {
  preferences: RentPreferences
  onChange: (preferences: RentPreferences) => void
}

export function RentPreferencesPanel({ preferences, onChange }: RentPreferencesPanelProps) {
  const update = <K extends keyof RentPreferences>(key: K, value: RentPreferences[K]) => {
    onChange({ ...preferences, [key]: value })
  }

  return (
    <Card className="p-5 space-y-5">
      <h2 className="font-display text-lg font-semibold">Your Preferences</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="max-budget">Max Monthly Budget (EUR)</Label>
          <Input
            id="max-budget"
            type="number"
            min={0}
            value={preferences.maxBudget || ''}
            onChange={(e) => update('maxBudget', Number(e.target.value))}
            placeholder="800"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferred-district">Preferred District</Label>
          <Input
            id="preferred-district"
            value={preferences.preferredDistrict}
            onChange={(e) => update('preferredDistrict', e.target.value)}
            placeholder="e.g. Liman 2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="minimum-size">Minimum Size (m²)</Label>
          <Input
            id="minimum-size"
            type="number"
            min={0}
            value={preferences.minimumSize || ''}
            onChange={(e) => update('minimumSize', Number(e.target.value))}
            placeholder="40"
          />
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <ToggleRow
          label="Furnished Required"
          checked={preferences.furnishedRequired}
          onChange={(v) => update('furnishedRequired', v)}
        />
        <ToggleRow
          label="Parking Required"
          checked={preferences.parkingRequired}
          onChange={(v) => update('parkingRequired', v)}
        />
        <ToggleRow
          label="Balcony Preferred"
          checked={preferences.balconyPreferred}
          onChange={(v) => update('balconyPreferred', v)}
        />
        <ToggleRow
          label="Pets Must Be Allowed"
          checked={preferences.petsRequired}
          onChange={(v) => update('petsRequired', v)}
        />
        <ToggleRow
          label="Remote Work Important"
          checked={preferences.remoteWorkImportant}
          onChange={(v) => update('remoteWorkImportant', v)}
        />
        <ToggleRow
          label="Quiet Area Important"
          checked={preferences.quietAreaImportant}
          onChange={(v) => update('quietAreaImportant', v)}
        />
      </div>
    </Card>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-normal cursor-pointer" htmlFor={undefined}>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}