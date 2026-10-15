'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getProfile, getWorkouts } from '@/lib/repositories'
import type { WorkoutType } from '@/lib/schemas'
import type { WorkoutLog } from '@/lib/trainer-data'
import { WeightChart } from '../weight-chart'
import { CalendarCard } from './calendar-card'
import { WorkoutLogList } from './workout-log-list'
import { WorkoutDetail } from './workout-detail'

function inferWorkoutType(planName: string): WorkoutType {
  const value = planName.toLowerCase()

  if (value.includes('pull')) return 'pull'
  if (value.includes('leg') || value.includes('nogi')) return 'legs'
  if (value.includes('cardio')) return 'cardio'

  return 'push'
}

function toWorkoutLog(workout: Awaited<ReturnType<typeof getWorkouts>>[number]): WorkoutLog {
  const date = workout.start_time.slice(0, 10)
  const sets = workout.exercises.flatMap((exercise) => exercise.sets)
  const volume = sets.reduce((sum, set) => sum + set.weight_kg * set.reps, 0)
  const duration = workout.end_time
    ? Math.max(1, Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000))
    : 0
  const type = inferWorkoutType(workout.plan_name || 'Push')
  const exerciseLines = workout.exercises.map((exercise) => {
    const totalSets = exercise.sets.length
    const summary = exercise.sets.length > 0 ? `${totalSets} × ${exercise.sets[0].reps}` : '0 × 0'
    const bestSet = exercise.sets.reduce(
      (best, set) => {
        if (!best || set.weight_kg * set.reps > best.weight_kg * best.reps) {
          return set
        }
        return best
      },
      exercise.sets[0],
    )

    return {
      name: exercise.exercise_name,
      sets: summary,
      best: bestSet ? `${bestSet.weight_kg.toFixed(1).replace(/\.0$/, '')} kg × ${bestSet.reps}` : '—',
    }
  })

  return {
    date,
    title: workout.plan_name || 'Trening',
    type,
    duration,
    volume: Math.round(volume),
    energy: workout.readiness_energy_score ?? 3,
    notes: workout.post_workout_user_notes || undefined,
    exercises: exerciseLines,
    aiFeedback: workout.ai_analysis?.feedback_text
      ? workout.ai_analysis.feedback_text
          .split(/\n|(?<=[.!?])\s+/)
          .map((line) => line.trim())
          .filter(Boolean)
      : ['Brak analizy AI dla tej sesji.'],
  }
}

export function HistoryView() {
  const [view, setView] = useState({ year: 2026, month: 9 })
  const [selected, setSelected] = useState('')
  const [logState, setLogState] = useState<WorkoutLog[]>([])
  const [weights, setWeights] = useState<{ date: string; weight: number }[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  const loadHistory = useCallback(async () => {
    setStatus('loading')
    setError('')

    try {
      const [profile, workouts] = await Promise.all([getProfile(), getWorkouts()])
      const nextWeights = (profile?.profile.weight_history ?? []).map((entry) => ({
        date: entry.date.slice(5).replace('-', '.'),
        weight: Number(entry.weight_kg.toFixed(1)),
      }))
      const nextLogs = [...workouts].sort((a, b) => b.start_time.localeCompare(a.start_time)).map(toWorkoutLog)

      setWeights(nextWeights)
      setLogState(nextLogs)
      setSelected((current) => (nextLogs.some((log) => log.date === current) ? current : nextLogs[0]?.date ?? ''))
      setStatus('ready')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się wczytać historii treningów.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHistory()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadHistory])

  const logsByDate = useMemo(() => new Map(logState.map((log) => [log.date, log])), [logState])
  const monthPrefix = `${view.year}-${String(view.month + 1).padStart(2, '0')}`
  const monthLogs = logState.filter((log) => log.date.startsWith(monthPrefix)).reverse()
  const effectiveSelected = selected && logsByDate.has(selected) ? selected : logState[0]?.date ?? ''

  const changeMonth = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Kalendarz i historia</h1>
          <p className="mt-1 text-sm text-muted-foreground">Przeglądaj sesje, postępy i analizy Trenera AI.</p>
        </div>
        <p role="status" className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Wczytywanie historii…
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Kalendarz i historia</h1>
          <p className="mt-1 text-sm text-muted-foreground">Przeglądaj sesje, postępy i analizy Trenera AI.</p>
        </div>
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Nie udało się wczytać historii.</p>
          <p className="mt-1">{error}</p>
          <button type="button" onClick={() => void loadHistory()} className="mt-3 underline underline-offset-2">
            Spróbuj ponownie
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Kalendarz i historia</h1>
        <p className="mt-1 text-sm text-muted-foreground">Przeglądaj sesje, postępy i analizy Trenera AI.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <CalendarCard
            year={view.year}
            month={view.month}
            logsByDate={logsByDate}
            selected={effectiveSelected}
            onSelect={setSelected}
            onChangeMonth={changeMonth}
          />
          <WorkoutLogList logs={monthLogs} selected={effectiveSelected} onSelect={setSelected} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <WorkoutDetail date={effectiveSelected} log={logsByDate.get(effectiveSelected)} />
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Postęp wagi</CardTitle>
              <CardDescription>Pomiary tygodniowe (kg)</CardDescription>
            </CardHeader>
            <CardContent>
              <WeightChart data={weights.length ? weights : [{ date: 'brak', weight: 0 }]} className="h-56 md:h-64" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
