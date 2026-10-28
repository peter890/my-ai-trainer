'use client'

import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RestType } from '@/lib/schemas'
import type { ExerciseDraft, EquipmentLabel } from '@/lib/exercise-catalog'
import { muscleGroups, type MuscleGroup } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'

const equipmentOptions: EquipmentLabel[] = ['Sztanga', 'Hantle', 'Wyciąg', 'Maszyna', 'Kalistenika', 'Kardio', 'Bieżnia']
const restOptions: { value: RestType; label: string }[] = [
  { value: 'heavy_compound', label: 'Ciężkie' },
  { value: 'moderate_compound', label: 'Złożone' },
  { value: 'isolation', label: 'Izolowane' },
  { value: 'isometric', label: 'Izometryczne' },
  { value: 'cardio', label: 'Kardio' },
]

type Props = {
  onAdd: (exercise: Omit<ExerciseDraft, 'id'>) => void
}

export function AddExerciseCard({ onAdd }: Props) {
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup>('Klatka')
  const [equipment, setEquipment] = useState<EquipmentLabel>('Hantle')
  const [restType, setRestType] = useState<RestType>('moderate_compound')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd({ name: trimmed.slice(0, 60), muscle, equipment, rest_type: restType })
    setName('')
  }

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle className="font-semibold">Dodaj własne ćwiczenie</CardTitle>
        <CardDescription>Pojawi się w katalogu i w generatorze planu.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="exercise-name">Nazwa</Label>
            <Input
              id="exercise-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Np. Wyciskanie na maszynie Hammer"
              maxLength={60}
              required
              className="h-11"
            />
          </div>

          <Chips label="Partia mięśniowa" options={muscleGroups} value={muscle} onChange={setMuscle} />
          <Chips label="Sprzęt" options={equipmentOptions} value={equipment} onChange={setEquipment} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Typ przerwy</legend>
            <div className="flex flex-wrap gap-1.5">
              {restOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRestType(option.value)}
                  aria-pressed={restType === option.value}
                  className={cn(
                    'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
                    restType === option.value
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={!name.trim()}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden="true" />
            Dodaj ćwiczenie
          </button>
        </form>
      </CardContent>
    </Card>
  )
}

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={cn(
              'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
              value === o
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
