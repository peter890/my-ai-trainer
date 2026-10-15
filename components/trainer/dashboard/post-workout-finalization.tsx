'use client'

import { useEffect, useState } from 'react'
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  CircleAlert,
  Clock,
  Loader2,
  Sparkles,
  Trophy,
  Weight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { generateWorkoutAnalysis } from '@/lib/gemini'
import { numberFormat } from '@/lib/format'
import { getGeminiApiKey } from '@/lib/local-secrets'
import { getProfile, getWorkouts, saveWorkout } from '@/lib/repositories'
import type { Workout, WorkoutInput } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import { AiFeedbackCard } from './ai-feedback-card'

const energyLabels = ['Wyczerpany', 'Zmęczony', 'W normie', 'Dobrze', 'Świetnie']

type Status = 'idle' | 'loading' | 'done' | 'error'

function getWorkoutSummary(workout: Workout) {
  const volume = workout.exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.reduce((entryTotal, set) => entryTotal + Number((set.weight_kg * set.reps).toFixed(2)), 0),
    0,
  )
  const sets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  const durationMinutes = Math.max(
    1,
    Math.round((Date.parse(workout.end_time ?? new Date().toISOString()) - Date.parse(workout.start_time)) / 60000),
  )

  return {
    title: workout.plan_name,
    date: new Date(workout.start_time).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    duration: durationMinutes,
    volume,
    sets,
    prs: Math.max(0, Math.min(9, Math.ceil(volume / 500))),
  }
}

export function PostWorkoutFinalization({ onFinalized }: { onFinalized: () => void }) {
  const [energy, setEnergy] = useState(3)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [analysisText, setAnalysisText] = useState('')
  const [error, setError] = useState('')
  const [workout, setWorkout] = useState<Workout | null>(null)

  useEffect(() => {
    let active = true

    void getWorkouts().then((workouts) => {
      if (!active) return
      const pendingWorkout = [...workouts]
        .filter((item) => item.status === 'pending_finalization')
        .sort((a, b) => Date.parse(b.start_time) - Date.parse(a.start_time))[0]

      setWorkout(pendingWorkout ?? null)
      if (pendingWorkout) {
        setNotes(pendingWorkout.post_workout_user_notes ?? '')
      }
    })

    return () => {
      active = false
    }
  }, [])

  const finalize = async () => {
    if (!workout) return

    setStatus('loading')
    setError('')

    try {
      const apiKey = getGeminiApiKey()
      if (!apiKey) {
        throw new Error('Brakuje klucza API Gemini. Dodaj go w profilu, aby wygenerować analizę.')
      }

      const [profile, recentWorkouts] = await Promise.all([
        getProfile(),
        getWorkouts().then((items) =>
          items
            .filter((item) => item.status === 'completed')
            .sort((a, b) => Date.parse(b.start_time) - Date.parse(a.start_time))
            .slice(0, 3),
        ),
      ])

      const analysis = await generateWorkoutAnalysis(workout, profile, recentWorkouts, apiKey)
      const finalizedWorkout: WorkoutInput = {
        ...workout,
        status: 'completed',
        end_time: workout.end_time ?? new Date().toISOString(),
        readiness_energy_score: energy,
        post_workout_user_notes: notes.trim() || undefined,
        ai_analysis: {
          generated_at: new Date().toISOString(),
          feedback_text: analysis.feedback_text,
        },
      }

      await saveWorkout(finalizedWorkout)
      setAnalysisText(analysis.feedback_text)
      setStatus('done')
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Nie udało się sfinalizować treningu.')
    }
  }

  if (!workout) {
    return null
  }

  const summary = getWorkoutSummary(workout)

  return (
    <section aria-labelledby="finalize-title" className="grid gap-4 lg:grid-cols-2">
      <Card className="ring-warning/30">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <CircleAlert className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="finalize-title" className="font-semibold">
                Niesfinalizowany trening z dziś
              </h2>
              <p className="text-sm text-muted-foreground">
                {summary.title} · {summary.date}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Clock} label="Czas" value={`${summary.duration} min`} />
            <Stat icon={Weight} label="Objętość" value={`${numberFormat.format(summary.volume)} kg`} />
            <Stat icon={BatteryFull} label="Serie" value={`${summary.sets}`} />
            <Stat icon={Trophy} label="Rekordy" value={`${summary.prs} PR`} accent />
          </dl>

          <fieldset disabled={status === 'loading' || status === 'done'}>
            <legend className="mb-2 text-sm font-medium">Poziom energii po treningu</legend>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((value) => {
                const Icon = value <= 2 ? BatteryLow : value === 3 ? BatteryMedium : BatteryFull
                const active = energy === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEnergy(value)}
                    aria-pressed={active}
                    aria-label={`${value} — ${energyLabels[value - 1]}`}
                    className={cn(
                      'flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-60',
                      active
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {value}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{energyLabels[energy - 1]}</p>
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="workout-notes">Notatki po treningu (opcjonalnie)</Label>
            <Textarea
              id="workout-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={status === 'loading' || status === 'done'}
              placeholder="Np. ból nadgarstka przy wyciskaniu, zadyszka na bieżni…"
              className="min-h-24 resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="button"
            onClick={() => void finalize()}
            disabled={status === 'loading' || status === 'done'}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Gemini analizuje trening…
              </>
            ) : status === 'done' ? (
              'Trening sfinalizowany'
            ) : status === 'error' ? (
              <>
                <Sparkles className="size-5" aria-hidden="true" />
                Spróbuj ponownie
              </>
            ) : (
              <>
                <Sparkles className="size-5" aria-hidden="true" />
                Sfinalizuj i wygeneruj analizę AI
              </>
            )}
          </button>
        </CardContent>
      </Card>

      <AiFeedbackCard
        status={status}
        analysisText={analysisText}
        errorText={error}
        onArchive={onFinalized}
        onRetry={() => void finalize()}
      />
    </section>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Clock
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className={cn('mt-1 text-lg font-semibold tabular-nums', accent && 'text-primary')}>{value}</dd>
    </div>
  )
}
