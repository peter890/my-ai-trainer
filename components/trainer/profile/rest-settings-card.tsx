'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProfileDocument } from '@/lib/schemas'

type RestTimerDefaults = ProfileDocument['settings']['rest_timer_defaults']
type RestTypeSetting = keyof RestTimerDefaults
type RestTimerSignal = ProfileDocument['settings']['rest_timer_signal']

const restSettings: { key: RestTypeSetting; label: string }[] = [
  { key: 'heavy_compound', label: 'Ciężkie ćwiczenia wielostawowe' },
  { key: 'moderate_compound', label: 'Umiarkowane ćwiczenia wielostawowe' },
  { key: 'isolation', label: 'Ćwiczenia izolowane' },
]

export function RestSettingsCard({
  values,
  onChange,
  signal,
  onSignalChange,
}: {
  values: RestTimerDefaults
  onChange: (key: RestTypeSetting, seconds: number) => void
  signal: RestTimerSignal
  onSignalChange: (signal: RestTimerSignal) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Domyślne przerwy</CardTitle>
        <CardDescription>
          Czas przerwy dobierany do typu ćwiczenia. Możesz go też zmienić podczas treningu.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {restSettings.map(({ key, label }) => (
          <RestDurationField
            key={`${key}-${values[key]}`}
            settingKey={key}
            label={label}
            value={values[key]}
            onCommit={onChange}
          />
        ))}
        <div className="flex flex-col gap-2 sm:col-span-3">
          <Label htmlFor="rest-timer-signal">Sygnał końca przerwy</Label>
          <select
            id="rest-timer-signal"
            value={signal}
            onChange={(event) => {
              if (event.target.value === 'none' || event.target.value === 'vibrate') {
                onSignalChange(event.target.value)
              }
            }}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="vibrate">Wibracja, jeśli jest obsługiwana</option>
            <option value="none">Bez sygnału</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Sygnał jest wyłączony, gdy przeglądarka lub urządzenie nie obsługuje wibracji.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function RestDurationField({
  settingKey,
  label,
  value,
  onCommit,
}: {
  settingKey: RestTypeSetting
  label: string
  value: number
  onCommit: (key: RestTypeSetting, seconds: number) => void
}) {
  const [text, setText] = useState(String(value))

  const commit = () => {
    const parsed = Number(text)
    if (!Number.isInteger(parsed) || parsed < 1) {
      setText(String(value))
      return
    }

    const bounded = Math.min(parsed, 3600)
    setText(String(bounded))
    if (bounded !== value) onCommit(settingKey, bounded)
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`rest-${settingKey}`}>{label}</Label>
      <div className="relative">
        <Input
          id={`rest-${settingKey}`}
          type="number"
          inputMode="numeric"
          min={1}
          max={3600}
          step={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          className="h-11 pr-12 tabular-nums"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
          sek.
        </span>
      </div>
    </div>
  )
}
