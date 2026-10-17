'use client'

import { useState } from 'react'
import { Ban, CalendarDays, Loader2, Save, Sparkles, Star } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { filterExercisesForPlan } from '@/lib/exercise-catalog'
import { createWorkoutPlan } from '@/lib/plan-builder'
import { savePlans } from '@/lib/repositories'
import type { Exercise, MuscleGroup } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'
import { SavedPlans } from './saved-plans'

const goals = ['Hipertrofia', 'Siła', 'Redukcja', 'Kondycja'] as const
const levels = ['Początkujący', 'Średni', 'Zaawansowany'] as const
const dayOptions = [2, 3, 4, 5, 6]
const lengthOptions = [45, 60, 75, 90]

const splits: Record<number, { name: string; muscles: MuscleGroup[] }[]> = {
  2: [
    { name: 'Full Body A', muscles: ['Klatka', 'Plecy', 'Nogi', 'Brzuch'] },
    { name: 'Full Body B', muscles: ['Barki', 'Nogi', 'Plecy', 'Ramiona'] },
  ],
  3: [
    { name: 'Push', muscles: ['Klatka', 'Barki', 'Ramiona'] },
    { name: 'Pull', muscles: ['Plecy', 'Ramiona', 'Brzuch'] },
    { name: 'Legs', muscles: ['Nogi', 'Brzuch'] },
  ],
  4: [
    { name: 'Upper A', muscles: ['Klatka', 'Plecy', 'Barki'] },
    { name: 'Lower A', muscles: ['Nogi', 'Brzuch'] },
    { name: 'Upper B', muscles: ['Plecy', 'Klatka', 'Ramiona'] },
    { name: 'Lower B', muscles: ['Nogi', 'Brzuch'] },
  ],
  5: [
    { name: 'Push A', muscles: ['Klatka', 'Barki', 'Ramiona'] },
    { name: 'Pull A', muscles: ['Plecy', 'Ramiona'] },
    { name: 'Legs', muscles: ['Nogi', 'Brzuch'] },
    { name: 'Upper', muscles: ['Klatka', 'Plecy', 'Barki'] },
    { name: 'Lower', muscles: ['Nogi', 'Brzuch'] },
  ],
  6: [
    { name: 'Push A', muscles: ['Klatka', 'Barki', 'Ramiona'] },
    { name: 'Pull A', muscles: ['Plecy', 'Ramiona'] },
    { name: 'Legs A', muscles: ['Nogi', 'Brzuch'] },
    { name: 'Push B', muscles: ['Barki', 'Klatka', 'Ramiona'] },
    { name: 'Pull B', muscles: ['Plecy', 'Brzuch'] },
    { name: 'Legs B', muscles: ['Nogi'] },
  ],
}

const schemes: Record<(typeof goals)[number], string> = {
  Hipertrofia: '3–4 × 8–12',
  Siła: '4–5 × 3–6',
  Redukcja: '3 × 10–15',
  Kondycja: '3 × 12–20',
}

type PlanDay = { name: string; exercises: (Exercise & { scheme: string })[] }

export function PlanGenerator({ exercises }: { exercises: Exercise[] }) {
  const [goal, setGoal] = useState<(typeof goals)[number]>('Hipertrofia')
  const [level, setLevel] = useState<(typeof levels)[number]>('Średni')
  const [days, setDays] = useState(4)
  const [length, setLength] = useState(60)
  const [preferFavorites, setPreferFavorites] = useState(true)
  const [skipExcluded, setSkipExcluded] = useState(true)
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<PlanDay[] | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [plansRevision, setPlansRevision] = useState(0)

  const generate = () => {
    setLoading(true)
    setPlan(null)
    setError('')
    setMessage('')
    const perDay = Math.max(3, Math.round(length / 15))
    const pool = filterExercisesForPlan(exercises, skipExcluded)

    setTimeout(() => {
      setPlan(
        splits[days].map((day, dayIndex) => {
          const candidates = pool
            .filter((e) => day.muscles.includes(e.muscle))
            .sort((a, b) => {
              const fav = preferFavorites ? Number(b.favorite) - Number(a.favorite) : 0
              if (fav !== 0) return fav
              return day.muscles.indexOf(a.muscle) - day.muscles.indexOf(b.muscle)
            })
          const rotated = [...candidates.slice(dayIndex % 2), ...candidates.slice(0, dayIndex % 2)]
          return {
            name: day.name,
            exercises: rotated.slice(0, perDay).map((e) => ({ ...e, scheme: schemes[goal] })),
          }
        }),
      )
      setLoading(false)
    }, 1400)
  }

  const saveGeneratedPlan = async () => {
    if (!plan || plan.some((day) => day.exercises.length === 0)) {
      setError('Każdy dzień planu musi zawierać co najmniej jedno ćwiczenie.')
      return
    }

    setSavingPlan(true)
    setError('')
    setMessage('')
    const timestamp = new Date().toISOString()

    try {
      const savedPlans = plan.map((day) =>
        createWorkoutPlan(
          {
            name: day.name,
            exercises: day.exercises.map((exercise) => ({
              id: exercise.id,
              restType: exercise.restType,
              scheme: exercise.scheme,
            })),
          },
          `plan-${crypto.randomUUID()}`,
          timestamp,
        ),
      )
      await savePlans(savedPlans)
      setMessage(`Zapisano plan tygodniowy (${savedPlans.length} treningów).`)
      setPlansRevision((current) => current + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się zapisać planu.')
    } finally {
      setSavingPlan(false)
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6">
      <Card className="lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle className="font-semibold">Parametry planu</CardTitle>
          <CardDescription>Dobór ćwiczeń uwzględnia cel, czas oraz ulubione i wykluczone pozycje.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Pills label="Cel" options={goals} value={goal} onChange={setGoal} />
          <Pills label="Poziom" options={levels} value={level} onChange={setLevel} />
          <Pills
            label="Dni treningowe w tygodniu"
            options={dayOptions}
            value={days}
            onChange={setDays}
            grid
          />
          <Pills
            label="Długość sesji"
            options={lengthOptions}
            value={length}
            onChange={setLength}
            format={(v) => `${v} min`}
            grid
          />

          <div className="flex flex-col gap-3 rounded-xl bg-secondary/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="prefer-fav" className="flex items-center gap-2 font-normal">
                <Star className="size-4 text-warning" aria-hidden="true" />
                Preferuj ulubione
              </Label>
              <Switch id="prefer-fav" checked={preferFavorites} onCheckedChange={setPreferFavorites} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="skip-excluded" className="flex items-center gap-2 font-normal">
                <Ban className="size-4 text-destructive" aria-hidden="true" />
                Pomiń wykluczone
              </Label>
              <Switch id="skip-excluded" checked={skipExcluded} onCheckedChange={setSkipExcluded} />
            </div>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="size-5" aria-hidden="true" />
            )}
            {loading ? 'Generowanie planu…' : 'Wygeneruj plan AI'}
          </button>
        </CardContent>
      </Card>

      <section aria-live="polite" aria-label="Wygenerowany plan">
        {!plan && !loading && (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <CalendarDays className="size-6" aria-hidden="true" />
            </div>
            <p className="font-semibold">Twój plan pojawi się tutaj</p>
            <p className="max-w-sm text-sm text-muted-foreground text-pretty">
              Ustaw parametry i wygeneruj tygodniowy plan dopasowany do celu, poziomu i dostępnego czasu.
            </p>
          </div>
        )}

        {loading && (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: days }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-card ring-1 ring-foreground/10" />
            ))}
          </div>
        )}

        {plan && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {goal} · {level}
              </span>{' '}
              — {days} dni × {length} min
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {plan.map((day, i) => (
                <Card key={day.name} size="sm">
                  <CardHeader>
                    <CardDescription>Dzień {i + 1}</CardDescription>
                    <CardTitle className="text-lg font-semibold">{day.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="flex flex-col divide-y divide-border">
                      {day.exercises.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <span className="flex min-w-0 items-center gap-1.5">
                            {e.favorite && <Star className="size-3.5 shrink-0 fill-warning text-warning" aria-label="Ulubione" />}
                            <span className="truncate">{e.name}</span>
                          </span>
                          <span className="shrink-0 font-mono text-xs text-muted-foreground">{e.scheme}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        {plan ? (
          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void saveGeneratedPlan()}
              disabled={savingPlan}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary hover:bg-primary/15 disabled:cursor-wait disabled:opacity-60"
            >
              {savingPlan ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              Zapisz plan tygodniowy
            </button>
            {message ? <p role="status" className="text-sm text-emerald-300">{message}</p> : null}
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </div>
        ) : null}
      </section>
      <SavedPlans exercises={exercises} refreshKey={plansRevision} />
    </div>
  )
}

function Pills<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format = String,
  grid,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  format?: (v: T) => string
  grid?: boolean
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className={cn('gap-1.5', grid ? 'grid grid-cols-[repeat(auto-fit,minmax(3rem,1fr))]' : 'flex flex-wrap')}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={cn(
              'h-10 rounded-xl border px-3 text-sm font-medium transition-colors',
              value === o
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {format(o)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
