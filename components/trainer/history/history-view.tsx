'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getProfile, getWorkouts } from '@/lib/repositories'
import { createWorkoutProgressSeries } from '@/lib/workout-progress'
import { groupWorkoutLogsByDate, createWorkoutLogs } from '@/lib/workout-history'
import type { WorkoutLog } from '@/lib/trainer-data'
import { CalendarCard } from './calendar-card'
import { StrengthProgressionChart } from './strength-progression-chart'
import { WeightVolumeChart } from './weight-volume-chart'
import { WorkoutLogList } from './workout-log-list'
import { WorkoutDetail } from './workout-detail'

export function HistoryView() {
  const [view, setView] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('')
  const [logState, setLogState] = useState<WorkoutLog[]>([])
  const [weightVolumePoints, setWeightVolumePoints] = useState(
    [] as ReturnType<typeof createWorkoutProgressSeries>['weight_volume_points'],
  )
  const [strengthProgressPoints, setStrengthProgressPoints] = useState(
    [] as ReturnType<typeof createWorkoutProgressSeries>['strength_progress_points'],
  )
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  const loadHistory = useCallback(async () => {
    setStatus('loading')
    setError('')

    try {
      const [profile, workouts] = await Promise.all([getProfile(), getWorkouts()])
      const progressSeries = createWorkoutProgressSeries(profile?.profile.weight_history ?? [], workouts)
      const nextLogs = createWorkoutLogs(workouts)

      setWeightVolumePoints(progressSeries.weight_volume_points)
      setStrengthProgressPoints(progressSeries.strength_progress_points)
      setLogState(nextLogs)
      const latestWorkout = nextLogs[0]
      setSelectedDate((current) =>
        nextLogs.some((log) => log.date === current) ? current : latestWorkout?.date ?? '',
      )
      setSelectedWorkoutId((current) =>
        nextLogs.some((log) => log.id === current) ? current : latestWorkout?.id ?? '',
      )
      if (latestWorkout) {
        const [year, month] = latestWorkout.date.split('-').map(Number)
        setView({ year: year!, month: month! - 1 })
      }
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

  const logsByDate = useMemo(() => groupWorkoutLogsByDate(logState), [logState])
  const monthPrefix = `${view.year}-${String(view.month + 1).padStart(2, '0')}`
  const monthLogs = logState.filter((log) => log.date.startsWith(monthPrefix))
  const effectiveSelectedDate =
    selectedDate && logsByDate.has(selectedDate) ? selectedDate : logState[0]?.date ?? ''
  const selectedLog =
    logState.find((log) => log.id === selectedWorkoutId && log.date === effectiveSelectedDate) ??
    logsByDate.get(effectiveSelectedDate)?.[0]

  const changeMonth = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  const selectDate = (date: string) => {
    setSelectedDate(date)
    setSelectedWorkoutId(logsByDate.get(date)?.[0]?.id ?? '')
  }
  const selectWorkout = (log: WorkoutLog) => {
    setSelectedDate(log.date)
    setSelectedWorkoutId(log.id)
  }

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
            selected={effectiveSelectedDate}
            onSelect={selectDate}
            onChangeMonth={changeMonth}
          />
          <WorkoutLogList logs={monthLogs} selectedId={selectedLog?.id ?? ''} onSelect={selectWorkout} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <WorkoutDetail date={effectiveSelectedDate} log={selectedLog} />
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Waga i tonaż</CardTitle>
              <CardDescription>Połączenie pomiarów masy ciała i objętości treningowej z lokalnej historii.</CardDescription>
            </CardHeader>
            <CardContent>
              {weightVolumePoints.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Brak pomiarów lub zakończonych sesji do wyświetlenia trendu.
                </p>
              ) : (
                <WeightVolumeChart data={weightVolumePoints} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Progresja siłowa</CardTitle>
              <CardDescription>
                Metoda: najlepszy szacowany 1RM z każdej sesji według wzoru Epleya, czyli ciężar × (1 + powtórzenia/30).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {strengthProgressPoints.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Brak serii siłowych do wyliczenia progresji.
                </p>
              ) : (
                <StrengthProgressionChart data={strengthProgressPoints} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
