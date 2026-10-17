'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ExperienceLevel, Gender, PrimaryGoal } from '@/lib/schemas'
import { cn } from '@/lib/utils'

const genderOptions: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Mężczyzna' },
  { value: 'female', label: 'Kobieta' },
  { value: 'other', label: 'Inna' },
]
const experienceOptions: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Początkujący' },
  { value: 'intermediate', label: 'Średniozaawansowany' },
  { value: 'advanced', label: 'Zaawansowany' },
]
const goalOptions: { value: PrimaryGoal; label: string }[] = [
  { value: 'hypertrophy', label: 'Hipertrofia' },
  { value: 'strength', label: 'Siła' },
  { value: 'weight_loss', label: 'Redukcja' },
  { value: 'endurance', label: 'Wytrzymałość' },
]

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return 'Niedowaga'
  if (bmi < 25) return 'Prawidłowa'
  if (bmi < 30) return 'Nadwaga'
  return 'Otyłość'
}

type BiometricsCardProps = {
  gender: Gender
  age: number
  height: number
  weight: number
  experienceLevel: ExperienceLevel
  primaryGoal: PrimaryGoal
  injuriesNotes: string
  onGenderChange: (value: Gender) => void
  onAgeChange: (value: number) => void
  onHeightChange: (value: number) => void
  onExperienceLevelChange: (value: ExperienceLevel) => void
  onPrimaryGoalChange: (value: PrimaryGoal) => void
  onInjuriesNotesChange: (value: string) => void
}

export function BiometricsCard({
  gender,
  age,
  height,
  weight,
  experienceLevel,
  primaryGoal,
  injuriesNotes,
  onGenderChange,
  onAgeChange,
  onHeightChange,
  onExperienceLevelChange,
  onPrimaryGoalChange,
  onInjuriesNotesChange,
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
            {genderOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onGenderChange(value)}
                aria-pressed={gender === value}
                className={cn(
                  'h-10 rounded-lg text-sm font-medium transition-colors',
                  gender === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="experience-level"
            label="Poziom zaawansowania"
            value={experienceLevel}
            options={experienceOptions}
            onChange={onExperienceLevelChange}
          />
          <SelectField
            id="primary-goal"
            label="Główny cel"
            value={primaryGoal}
            options={goalOptions}
            onChange={onPrimaryGoalChange}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="injuries-notes">Kontuzje i uwagi</Label>
          <Textarea
            id="injuries-notes"
            value={injuriesNotes}
            maxLength={4000}
            onChange={(event) => onInjuriesNotesChange(event.target.value)}
            placeholder="Opisz kontuzje, ograniczenia lub ważne uwagi"
            className="min-h-24"
          />
          <p className="text-xs text-muted-foreground">{injuriesNotes.length}/4000</p>
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

function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const option = options.find((candidate) => candidate.value === event.target.value)
          if (option) onChange(option.value)
        }}
        className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
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
