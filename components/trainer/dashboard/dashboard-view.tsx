'use client'

import { useEffect, useState } from 'react'
import type { TabId } from '@/lib/trainer-data'
import type { WorkoutDashboardStats } from '@/lib/schemas'
import { getWorkouts } from '@/lib/repositories'
import { calculateWorkoutDashboardStats } from '@/lib/workout-stats'
import { formatCurrentDate } from '@/lib/format'
import { QuickStartCard } from './quick-start-card'
import { StreakCard } from './streak-card'
import { WeightTrendCard } from './weight-trend-card'
import { WeeklyStatsCard } from './weekly-stats-card'
import { PostWorkoutFinalization } from './post-workout-finalization'

type Props = {
  liveActive: boolean
  onStartWorkout: (planId: string) => void
  onStartFreeWorkout: () => void
  hasUnfinalized: boolean
  onFinalized: () => void
  onNavigate: (tab: TabId) => void
}

export function DashboardView({ liveActive, onStartWorkout, onStartFreeWorkout, hasUnfinalized, onFinalized, onNavigate }: Props) {
  const [stats, setStats] = useState<WorkoutDashboardStats | null>(null)
  const [statsError, setStatsError] = useState('')

  useEffect(() => {
    let active = true

    void getWorkouts()
      .then((workouts) => {
        if (active) {
          setStatsError('')
          setStats(calculateWorkoutDashboardStats(workouts))
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setStatsError(cause instanceof Error ? cause.message : 'Nie udało się wczytać statystyk treningowych.')
        }
      })

    return () => {
      active = false
    }
  }, [hasUnfinalized, liveActive])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">{formatCurrentDate()}</p>
      </div>

      {hasUnfinalized && <PostWorkoutFinalization onFinalized={onFinalized} />}
      {statsError ? (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Nie udało się wczytać statystyk treningowych: {statsError}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickStartCard
          liveActive={liveActive}
          onStart={onStartWorkout}
          onStartFree={onStartFreeWorkout}
          className="md:col-span-2"
        />
        <StreakCard stats={stats} error={statsError} />
        <WeightTrendCard onOpenProfile={() => onNavigate('profile')} className="md:col-span-2 lg:col-span-2" />
        <WeeklyStatsCard stats={stats} onOpenHistory={() => onNavigate('history')} className="md:col-span-2 lg:col-span-1" />
      </div>
    </div>
  )
}
