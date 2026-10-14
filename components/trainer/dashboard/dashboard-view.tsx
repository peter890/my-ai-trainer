'use client'

import type { TabId } from '@/lib/trainer-data'
import { QuickStartCard } from './quick-start-card'
import { StreakCard } from './streak-card'
import { WeightTrendCard } from './weight-trend-card'
import { WeeklyStatsCard } from './weekly-stats-card'
import { PostWorkoutFinalization } from './post-workout-finalization'

type Props = {
  liveActive: boolean
  onStartWorkout: () => void
  hasUnfinalized: boolean
  onFinalized: () => void
  onNavigate: (tab: TabId) => void
}

export function DashboardView({ liveActive, onStartWorkout, hasUnfinalized, onFinalized, onNavigate }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Środa, 14 października</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance md:text-3xl">Cześć, Kamil</h1>
      </div>

      {hasUnfinalized && <PostWorkoutFinalization onFinalized={onFinalized} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickStartCard liveActive={liveActive} onStart={onStartWorkout} className="md:col-span-2" />
        <StreakCard />
        <WeightTrendCard onOpenProfile={() => onNavigate('profile')} className="md:col-span-2 lg:col-span-2" />
        <WeeklyStatsCard onOpenHistory={() => onNavigate('history')} className="md:col-span-2 lg:col-span-1" />
      </div>
    </div>
  )
}
