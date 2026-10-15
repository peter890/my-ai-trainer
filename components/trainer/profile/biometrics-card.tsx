'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const genders = ['Mężczyzna', 'Kobieta', 'Inna'] as const

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return 'Niedowaga'
  if (bmi < 25) return 'Prawidłowa'
  if (bmi < 30) return 'Nadwaga'
  return 'Otyłość'
}

type BiometricsCardProps = {
  gender: (typeof genders)[number]
  age: number
  height: number
  weight: number
  onGenderChange: (value: (typeof genders)[number]) => void
  onAgeChange: (value: number) => void
  onHeightChange: (value: number) => void
}

export function BiometricsCard({
  gender,
  age,
  height,
  weight,
  onGenderChange,
  onAgeChange,
  onHeightChange,
}: BiometricsCardProps) {
  const h = height / 100
  const bmi = h > 0 ? weight / (h * h) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Dane biometryczne</CardTitle>
        <CardDescription>Wykorzystywane do kalibracji obciążeń i analiz AI.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Płeć</legend>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/60 p-1">
            {genders.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGenderChange(g)}
                aria-pressed={gender === g}
                className={cn(
                  'h-10 rounded-lg text-sm font-medium transition-colors',
                  gender === g ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-3 gap-3">
          <Field id="age" label="Wiek" unit="lat" value={String(age)} onChange={(v) => onAgeChange(Number(v) || 0)} />
          <Field
            id="height"
            label="Wzrost"
            unit="cm"
            value={String(height)}
            onChange={(v) => onHeightChange(Number(v) || 0)}
          />
          <Field id="weight" label="Waga" unit="kg" value={weight.toLocaleString('pl-PL')} readOnly />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-4">
          <div>
            <p className="text-xs text-muted-foreground">BMI</p>
            <p className="text-2xl font-semibold tabular-nums">{bmi.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}</p>
          </div>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">{bmiCategory(bmi)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function Field({
  id,
  label,
  unit,
  value,
  onChange,
  readOnly,
}: {
  id: string
  label: string
  unit: string
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
          className={cn('h-11 pr-9 tabular-nums', readOnly && 'text-muted-foreground')}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  )
}
