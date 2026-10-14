'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { liveWorkoutPlan, type LoggedSet } from '@/lib/trainer-data'
import { LiveWorkoutHeader } from './live-workout-header'
import { ExerciseCard } from './exercise-card'
import { SetsTable } from './sets-table'
import { RestTimer } from './rest-timer'
import { ExerciseQueue } from './exercise-queue'

type LiveWorkoutProps = {
  onMinimize: () => void
  onFinish: () => void
}

export function LiveWorkout({ onMinimize, onFinish }: LiveWorkoutProps) {
  const [index, setIndex] = useState(1)
  const [setsByExercise, setSetsByExercise] = useState<LoggedSet[][]>(() =>
    liveWorkoutPlan.map((e) => e.completedSets),
  )
  const [swaps, setSwaps] = useState<number[]>(() => liveWorkoutPlan.map(() => 0))
  const [draft, setDraft] = useState<LoggedSet>({ weight: 80, reps: 8, rir: 2 })
  const [elapsed, setElapsed] = useState(42 * 60 + 15)
  const [paused, setPaused] = useState(false)
  const [rest, setRest] = useState({ remaining: 84, total: 180 })

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      setElapsed((s) => s + 1)
      setRest((r) => (r.remaining > 0 ? { ...r, remaining: r.remaining - 1 } : r))
    }, 1000)
    return () => clearInterval(id)
  }, [paused])

  const exercise = liveWorkoutPlan[index]
  const nameOptions = [exercise.name, ...exercise.alternatives]
  const currentName = nameOptions[swaps[index] % nameOptions.length]
  const sets = setsByExercise[index]
  const isLast = index === liveWorkoutPlan.length - 1

  const totalTarget = liveWorkoutPlan.reduce((sum, e) => sum + e.targetSets, 0)
  const totalDone = setsByExercise.reduce((sum, s) => sum + s.length, 0)

  const goTo = (next: number) => {
    setIndex(next)
    const last = setsByExercise[next].at(-1)
    setDraft(last ? { ...last } : { ...liveWorkoutPlan[next].suggested, rir: 2 })
    setRest((r) => ({ ...r, remaining: 0 }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const logSet = () => {
    setSetsByExercise((prev) => prev.map((s, i) => (i === index ? [...s, { ...draft }] : s)))
    setRest({ remaining: exercise.restSeconds, total: exercise.restSeconds })
  }

  const adjustRest = (delta: number) =>
    setRest((r) => {
      const remaining = Math.max(0, r.remaining + delta)
      return { remaining, total: Math.max(r.total, remaining) }
    })

  const restTimer = (
    <RestTimer
      remaining={rest.remaining}
      total={rest.total}
      paused={paused}
      onAdjust={adjustRest}
      onSkip={() => setRest((r) => ({ ...r, remaining: 0 }))}
    />
  )

  return (
    <div className="min-h-dvh">
      <LiveWorkoutHeader
        title="Push A"
        elapsed={elapsed}
        paused={paused}
        position={`Ćwiczenie ${index + 1} z ${liveWorkoutPlan.length}`}
        progress={Math.min(100, (totalDone / totalTarget) * 100)}
        onTogglePause={() => setPaused((p) => !p)}
        onFinish={onFinish}
        onMinimize={onMinimize}
      />

      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 md:px-8 md:py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <ExerciseCard
            key={`${exercise.id}-${swaps[index]}`}
            name={currentName}
            note={exercise.note}
            lastTime={exercise.lastTime}
            targetSets={exercise.targetSets}
            targetReps={exercise.targetReps}
            doneSets={sets.length}
            hasAlternatives={exercise.alternatives.length > 0}
            onSwap={() => setSwaps((prev) => prev.map((v, i) => (i === index ? v + 1 : v)))}
          />
          <div className="lg:hidden">{restTimer}</div>
          <SetsTable
            sets={sets}
            targetSets={exercise.targetSets}
            targetReps={exercise.targetReps}
            draft={draft}
            onDraftChange={setDraft}
            onLogSet={logSet}
          />
        </div>

        <aside className="hidden flex-col gap-4 lg:flex">
          {restTimer}
          <ExerciseQueue
            exercises={liveWorkoutPlan}
            setsByExercise={setsByExercise}
            activeIndex={index}
            onSelect={goTo}
          />
        </aside>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-border bg-background/90 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:px-8">
        <div className="mx-auto flex w-full max-w-7xl gap-3">
          <Button
            size="lg"
            className="h-14 flex-1 rounded-2xl text-base font-semibold"
            onClick={() => (isLast ? onFinish() : goTo(index + 1))}
          >
            {isLast ? (
              <>
                <Flag className="size-5" aria-hidden="true" />
                Zakończ trening
              </>
            ) : (
              <>
                Następne ćwiczenie
                <ArrowRight className="size-5" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
