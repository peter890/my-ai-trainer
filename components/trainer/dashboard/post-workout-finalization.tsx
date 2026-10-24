'use client'

import { useEffect, useRef, useState } from 'react'
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
import { generateWorkoutAnalysis } from '@/lib/ai'
import { numberFormat } from '@/lib/format'
import { getAiApiKey, getAiProvider } from '@/lib/local-secrets'
import { getProfile, getWorkouts, saveWorkout } from '@/lib/repositories'
import type { Workout, WorkoutInput } from '@/lib/schemas'
import { createWorkoutSurveyUpdate, getPendingFinalizationWorkouts } from '@/lib/post-workout'
import { cn } from '@/lib/utils'
import { AiFeedbackCard } from './ai-feedback-card'

const energyLabels = ['Wyczerpany', 'Zmęczony', 'W normie', 'Dobrze', 'Świetnie']

type Status = 'idle' | 'loading' | 'saving' | 'done' | 'saved' | 'error'

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
  const [consentToAi, setConsentToAi] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [analysisText, setAnalysisText] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [answerSaveError, setAnswerSaveError] = useState('')
  const [pendingWorkouts, setPendingWorkouts] = useState<Workout[]>([])
  const saveQueue = useRef(Promise.resolve())
  const workout = pendingWorkouts[0] ?? null

  useEffect(() => {
    let active = true

    void getWorkouts().then((workouts) => {
      if (!active) return
      const pending = getPendingFinalizationWorkouts(workouts)
      setPendingWorkouts(pending)
      if (pending[0]) {
        setEnergy(pending[0].readiness_energy_score ?? 3)
        setNotes(pending[0].post_workout_user_notes ?? '')
      }
    }).catch((cause: unknown) => {
      if (active) {
        setLoadError(
          cause instanceof Error ? cause.message : 'Nie udało się wczytać treningów do finalizacji.',
        )
      }
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!workout || status === 'loading' || status === 'saving' || status === 'done' || status === 'saved') return

    const timeout = window.setTimeout(() => {
      const updatedWorkout = createWorkoutSurveyUpdate(workout, energy, notes)
      const save = saveQueue.current.catch(() => undefined).then(() => saveWorkout(updatedWorkout))
      saveQueue.current = save.then(() => undefined, () => undefined)
      void save.then(() => setAnswerSaveError('')).catch((cause: unknown) => {
        setAnswerSaveError(cause instanceof Error ? cause.message : 'Nie udało się zapisać ankiety.')
      })
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [energy, notes, status, workout])

  const saveSurvey = async () => {
    if (!workout) return undefined
    await saveQueue.current
    const updatedWorkout = createWorkoutSurveyUpdate(workout, energy, notes)
    await saveWorkout(updatedWorkout)
    setAnswerSaveError('')
    return updatedWorkout
  }

  const finalize = async () => {
    if (!workout || !consentToAi) return

    setStatus('loading')
    setError('')

    try {
      const surveyWorkout = await saveSurvey()
      if (!surveyWorkout) return
      const provider = getAiProvider()
      const apiKey = getAiApiKey(provider)
      if (!apiKey) {
        throw new Error('Brakuje klucza API wybranego dostawcy AI. Dodaj go w profilu, aby wygenerować analizę.')
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

      const analysis = await generateWorkoutAnalysis(
        surveyWorkout,
        profile,
        recentWorkouts,
        provider,
        apiKey,
      )
      const finalizedWorkout: WorkoutInput = {
        ...surveyWorkout,
        status: 'completed',
        end_time: workout.end_time ?? new Date().toISOString(),
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

  const completeWithoutAnalysis = async () => {
    if (!workout || status === 'loading' || status === 'saving') return
    setStatus('saving')
    setError('')

    try {
      const surveyWorkout = await saveSurvey()
      if (!surveyWorkout) return
      await saveWorkout({
        ...surveyWorkout,
        status: 'completed',
        end_time: workout.end_time ?? new Date().toISOString(),
      })
      setAnalysisText('')
      setStatus('saved')
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Nie udało się zapisać treningu.')
    }
  }

  const archiveCurrentWorkout = () => {
    if (!workout || (status !== 'done' && status !== 'saved')) return
    const remaining = pendingWorkouts.slice(1)
    setPendingWorkouts(remaining)
    if (remaining.length === 0) {
      onFinalized()
      return
    }

    setEnergy(remaining[0]?.readiness_energy_score ?? 3)
    setNotes(remaining[0]?.post_workout_user_notes ?? '')
    setConsentToAi(false)
    setStatus('idle')
    setAnalysisText('')
    setError('')
    setAnswerSaveError('')
  }

  if (!workout) {
    return loadError ? (
      <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Nie udało się wczytać treningów do finalizacji: {loadError}
      </p>
    ) : null
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
                Niesfinalizowany trening
              </h2>
              <p className="text-sm text-muted-foreground">
                {summary.title} · {summary.date}
              </p>
              {pendingWorkouts.length > 1 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Trening {1} z {pendingWorkouts.length} do finalizacji
                </p>
              ) : null}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Clock} label="Czas" value={`${summary.duration} min`} />
            <Stat icon={Weight} label="Objętość" value={`${numberFormat.format(summary.volume)} kg`} />
            <Stat icon={BatteryFull} label="Serie" value={`${summary.sets}`} />
            <Stat icon={Trophy} label="Rekordy" value={`${summary.prs} PR`} accent />
          </dl>

          <fieldset disabled={status === 'loading' || status === 'saving' || status === 'done' || status === 'saved'}>
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
              maxLength={4000}
              disabled={status === 'loading' || status === 'saving' || status === 'done' || status === 'saved'}
              placeholder="Np. ból nadgarstka przy wyciskaniu, zadyszka na bieżni…"
              className="min-h-24 resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {answerSaveError ? (
            <p role="alert" className="text-sm text-destructive">
              Nie udało się automatycznie zapisać ankiety: {answerSaveError}
            </p>
          ) : null}

          <label
            htmlFor="ai-consent"
            className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3 text-sm"
          >
            <input
              id="ai-consent"
              type="checkbox"
              checked={consentToAi}
              onChange={(event) => setConsentToAi(event.target.checked)}
              disabled={status === 'loading' || status === 'saving' || status === 'done' || status === 'saved'}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="text-muted-foreground">
              Zgadzam się wysłać do wybranego dostawcy AI dane tej sesji (plan, ćwiczenia, serie i czas), ankietę energii i
              notatki, dane profilu (płeć, wiek, wzrost, aktualna waga, cel, poziom i wykluczone ćwiczenia) oraz
              podsumowania maksymalnie 3 ostatnich treningów. Klucz API jest przechowywany lokalnie, używany wyłącznie do
              tego żądania i nie trafia do historii ani synchronizacji Drive.
            </span>
          </label>

          <button
            type="button"
            onClick={() => void finalize()}
            disabled={
              !consentToAi ||
              status === 'loading' ||
              status === 'saving' ||
              status === 'done' ||
              status === 'saved'
            }
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                AI analizuje trening…
              </>
            ) : status === 'saving' ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Zapisywanie treningu…
              </>
            ) : status === 'done' ? (
              'Trening sfinalizowany'
            ) : status === 'saved' ? (
              'Trening zapisany'
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
          {status !== 'done' && status !== 'saved' ? (
            <button
              type="button"
              onClick={() => void completeWithoutAnalysis()}
              disabled={status === 'loading' || status === 'saving'}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-secondary/40 px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
            >
              Zapisz trening bez analizy AI
            </button>
          ) : null}
        </CardContent>
      </Card>

      <AiFeedbackCard
        status={status}
        analysisText={analysisText}
        errorText={error}
        onArchive={archiveCurrentWorkout}
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
