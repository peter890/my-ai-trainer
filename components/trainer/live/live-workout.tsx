'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getExercises, getPlans, getWorkouts, saveWorkout } from '@/lib/repositories'
import { buildSessionExercises, type SessionExercise } from '@/lib/live-session'
import type { LoggedSet } from '@/lib/trainer-data'
import { LiveWorkoutHeader } from './live-workout-header'
import { ExerciseCard } from './exercise-card'
import { SetsTable } from './sets-table'
import { RestTimer } from './rest-timer'
import { ExerciseQueue } from './exercise-queue'

type LiveWorkoutProps = {
  onMinimize: () => void
  onFinish: () => void
}

type SessionState = {
  workoutId: string
  startedAt: number
  planId: string
  planName: string
  exercises: SessionExercise[]
  elapsedMs: number
  paused: boolean
  lastTickAt: number
  restRemainingMs: number
  restTotalMs: number
}

const emptySet = (exercise?: SessionExercise): LoggedSet => ({
  weight: exercise?.suggested.weight ?? 0,
  reps: exercise?.suggested.reps ?? 0,
  rir: 2,
})

export function LiveWorkout({ onMinimize, onFinish }: LiveWorkoutProps) {
  const [session, setSession] = useState<SessionState | null>(null)
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState<LoggedSet>(emptySet())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    void Promise.all([getPlans(), getExercises(), getWorkouts()]).then(([plans, exercises, workouts]) => {
      if (!active || plans.length === 0) {
        setIsLoading(false)
        return
      }

      const plan = plans[0]
      const currentWorkout = workouts.find((workout) => workout.status === 'in_progress')
      const sessionExercises = buildSessionExercises(plan, exercises, workouts)
      const now = Date.now()
      const nextSession: SessionState = {
        workoutId: currentWorkout?.id ?? `live-session-${now}`,
        startedAt: currentWorkout?.start_time ? Date.parse(currentWorkout.start_time) : now,
        planId: plan.id,
        planName: plan.name,
        exercises: sessionExercises,
        elapsedMs: currentWorkout?.paused_duration_ms ?? 0,
        paused: false,
        lastTickAt: now,
        restRemainingMs: 0,
        restTotalMs: 0,
      }

      setSession(nextSession)
      setDraft(emptySet(nextSession.exercises[0]))
      setIsLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!session || session.paused) return

    const timer = window.setInterval(() => {
      const now = Date.now()
      setSession((current) => {
        if (!current || current.paused) return current
        const deltaMs = now - current.lastTickAt
        return {
          ...current,
          elapsedMs: current.elapsedMs + deltaMs,
          lastTickAt: now,
          restRemainingMs: current.restRemainingMs > 0 ? Math.max(0, current.restRemainingMs - deltaMs) : 0,
        }
      })
    }, 250)

    return () => window.clearInterval(timer)
  }, [session])

  useEffect(() => {
    if (!session) return

    void saveWorkout({
      id: session.workoutId,
      start_time: new Date(session.startedAt).toISOString(),
      status: 'in_progress',
      plan_name: session.planName,
      plan_id: session.planId,
      exercises: session.exercises.map((exercise) => ({
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.name,
        sets: exercise.completedSets.map((set, setIndex) => ({
          set_number: setIndex + 1,
          weight_kg: set.weight,
          reps: set.reps,
          rir: set.rir,
        })),
        note_during_workout: exercise.note,
      })),
      paused_at: session.paused ? new Date().toISOString() : undefined,
      paused_duration_ms: session.elapsedMs,
    }).catch(() => undefined)
  }, [session])

  const exercise = session?.exercises[index] ?? null
  const sets = exercise?.completedSets ?? []
  const isLast = !!session && index === session.exercises.length - 1
  const totalTarget = session?.exercises.reduce((sum, item) => sum + item.targetSets, 0) ?? 0
  const totalDone = session?.exercises.reduce((sum, item) => sum + item.completedSets.length, 0) ?? 0

  const goTo = (next: number) => {
    if (!session) return
    const target = Math.max(0, Math.min(next, session.exercises.length - 1))
    setIndex(target)
    const nextExercise = session.exercises[target]
    const last = nextExercise.completedSets.at(-1)
    setDraft(
      last
        ? { weight: last.weight, reps: last.reps, rir: last.rir }
        : { weight: nextExercise.suggested.weight, reps: nextExercise.suggested.reps, rir: 2 },
    )
    setSession((current) =>
      current
        ? {
            ...current,
            restRemainingMs: 0,
            restTotalMs: nextExercise.restSeconds * 1000,
          }
        : current,
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const logSet = () => {
    if (!exercise || !session) return

    setSession((current) => {
      if (!current) return current
      const exercises = current.exercises.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              completedSets: [...item.completedSets, { weight: draft.weight, reps: draft.reps, rir: draft.rir }],
            }
          : item,
      )

      return {
        ...current,
        exercises,
        restRemainingMs: exercise.restSeconds * 1000,
        restTotalMs: exercise.restSeconds * 1000,
      }
    })

    setDraft({ weight: exercise.suggested.weight, reps: exercise.suggested.reps, rir: 2 })
  }

  const adjustRest = (deltaMs: number) => {
    if (!session) return
    setSession((current) => {
      if (!current) return current
      const remaining = Math.max(0, current.restRemainingMs + deltaMs)
      return {
        ...current,
        restRemainingMs: remaining,
        restTotalMs: Math.max(current.restTotalMs, remaining),
      }
    })
  }

  const finishWorkout = async () => {
    if (!session) return

    const completedWorkout = {
      id: session.workoutId,
      start_time: new Date(session.startedAt).toISOString(),
      end_time: new Date().toISOString(),
      status: 'pending_finalization' as const,
      plan_name: session.planName,
      plan_id: session.planId,
      paused_duration_ms: session.elapsedMs,
      exercises: session.exercises.map((item, itemIndex) => ({
        exercise_id: item.exercise_id,
        exercise_name: item.name,
        sets: item.completedSets.map((set, setIndex) => ({
          set_number: setIndex + 1,
          weight_kg: set.weight,
          reps: set.reps,
          rir: set.rir,
        })),
        note_during_workout: item.note,
      })),
    }

    await saveWorkout(completedWorkout)
    onFinish()
  }

  const restTimer = session ? (
    <RestTimer
      remaining={Math.max(0, Math.ceil(session.restRemainingMs / 1000))}
      total={Math.max(1, Math.ceil(session.restTotalMs / 1000))}
      paused={session.paused}
      onAdjust={(delta) => adjustRest(delta * 1000)}
      onSkip={() =>
        setSession((current) =>
          current
            ? {
                ...current,
                restRemainingMs: 0,
              }
            : current,
        )
      }
    />
  ) : null

  if (isLoading || !session || !exercise) {
    return <div className="min-h-dvh bg-background px-4 py-12 text-center text-muted-foreground">Ładowanie treningu…</div>
  }

  return (
    <div className="min-h-dvh">
      <LiveWorkoutHeader
        title={session.planName}
        elapsed={Math.max(0, Math.floor(session.elapsedMs / 1000))}
        paused={session.paused}
        position={`Ćwiczenie ${index + 1} z ${session.exercises.length}`}
        progress={Math.min(100, (totalDone / totalTarget) * 100 || 0)}
        onTogglePause={() =>
          setSession((current) => (current ? { ...current, paused: !current.paused, lastTickAt: Date.now() } : current))
        }
        onFinish={finishWorkout}
        onMinimize={onMinimize}
      />

      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 md:px-8 md:py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <ExerciseCard
            key={`${exercise.exercise_id}-${index}`}
            name={exercise.name}
            note={exercise.note}
            lastTime={exercise.lastTime}
            targetSets={exercise.targetSets}
            targetReps={exercise.targetReps}
            doneSets={sets.length}
            hasAlternatives={exercise.alternatives.length > 0}
            onSwap={() => {
              const alternatives = exercise.alternatives
              if (!alternatives.length) return
              setSession((current) => {
                if (!current) return current
                const updatedExercises = current.exercises.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, name: item.name === alternatives[0] ? alternatives[1] ?? item.name : alternatives[0] }
                    : item,
                )
                return { ...current, exercises: updatedExercises }
              })
            }}
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
            exercises={session.exercises}
            setsByExercise={session.exercises.map((item) => item.completedSets)}
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
            onClick={() => (isLast ? void finishWorkout() : goTo(index + 1))}
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
