'use client'

import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { getWorkouts } from '@/lib/repositories'
import type { WorkoutMode } from '@/lib/schemas'
import type { TabId } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'
import { BottomNav, Logo, Sidebar } from './navigation'
import { DashboardView } from './dashboard/dashboard-view'
import { HistoryView } from './history/history-view'
import { ExercisesView } from './exercises/exercises-view'
import { ProfileView } from './profile/profile-view'
import { LiveWorkout } from './live/live-workout'

export function AppShell() {
  const [tab, setTab] = useState<TabId>('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [liveActive, setLiveActive] = useState(false)
  const [liveVisible, setLiveVisible] = useState(false)
  const [hasUnfinalized, setHasUnfinalized] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('planned')

  useEffect(() => {
    let active = true

    void getWorkouts()
      .then((workouts) => {
        if (!active) return
        const ongoing = workouts.find((workout) => workout.status === 'in_progress')
        if (ongoing) {
          setLiveActive(true)
          setLiveVisible(true)
          setSelectedPlanId(ongoing.plan_id ?? '')
          setWorkoutMode(ongoing.workout_mode ?? 'planned')
        }
        setHasUnfinalized(workouts.some((workout) => workout.status === 'pending_finalization'))
      })
      .catch(() => {
        if (active) {
          setHasUnfinalized(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const selectTab = (next: TabId) => {
    setTab(next)
    setLiveVisible(false)
    window.scrollTo({ top: 0 })
  }

  const startWorkout = (planId: string) => {
    setSelectedPlanId(planId)
    setWorkoutMode('planned')
    setLiveActive(true)
    setLiveVisible(true)
    window.scrollTo({ top: 0 })
  }

  const startFreeWorkout = () => {
    setSelectedPlanId('')
    setWorkoutMode('free')
    setLiveActive(true)
    setLiveVisible(true)
    window.scrollTo({ top: 0 })
  }

  const finishWorkout = () => {
    setLiveActive(false)
    setLiveVisible(false)
    setHasUnfinalized(true)
    setTab('dashboard')
    window.scrollTo({ top: 0 })
  }

  const abortWorkoutStart = () => {
    setLiveActive(false)
    setLiveVisible(false)
    setSelectedPlanId('')
    setTab('dashboard')
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar
        active={tab}
        onSelect={selectTab}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        liveActive={liveActive}
        onOpenLive={() => setLiveVisible(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {!liveVisible && (
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
            <Logo />
            <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              PWA
            </span>
          </header>
        )}

        <main className={cn('flex-1', !liveVisible && 'pb-28 md:pb-10')}>
          {liveActive && (
            <div className={cn(!liveVisible && 'hidden')}>
              <LiveWorkout
                planId={selectedPlanId}
                mode={workoutMode}
                onMinimize={() => setLiveVisible(false)}
                onAbort={abortWorkoutStart}
                onFinish={finishWorkout}
              />
            </div>
          )}

          {!liveVisible && (
            <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-8 md:py-8">
              {tab === 'dashboard' && (
                <DashboardView
                  liveActive={liveActive}
                  onStartWorkout={startWorkout}
                  onStartFreeWorkout={startFreeWorkout}
                  hasUnfinalized={hasUnfinalized}
                  onFinalized={() => setHasUnfinalized(false)}
                  onNavigate={selectTab}
                />
              )}
              {tab === 'history' && <HistoryView />}
              {tab === 'exercises' && <ExercisesView />}
              {tab === 'profile' && <ProfileView />}
            </div>
          )}
        </main>
      </div>

      {liveActive && !liveVisible && (
        <button
          type="button"
          onClick={() => setLiveVisible(true)}
          className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-12 items-center justify-between rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] md:hidden"
        >
          <span className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-primary-foreground" aria-hidden="true" />
            Trening w toku — Push A
          </span>
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      )}

      {!liveVisible && <BottomNav active={tab} onSelect={selectTab} />}
    </div>
  )
}
