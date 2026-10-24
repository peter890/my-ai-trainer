'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getExercisePreferences,
  getExercises,
  getLiveSessionSnapshot,
  getPlans,
  getProfile,
  getWorkouts,
  deleteLiveSessionSnapshot,
  saveLiveSessionSnapshot,
  saveWorkout,
} from '@/lib/repositories'
import {
  buildSessionExercises,
  getSessionElapsedMs,
  getSessionRestRemainingMs,
  prepareInterruptedWorkoutForFinalization,
  validateSetDraft,
  type SetDraft,
  type SessionClockState,
  type SessionExercise,
} from '@/lib/live-session'
import type { LoggedSet } from '@/lib/trainer-data'
import type { CardioMetrics, Workout } from '@/lib/schemas'
import { getCardioSummary } from '@/lib/cardio'
import { getExpiredRestSignalEnd, sendRestCompletionSignal } from '@/lib/rest-signal'
import { LiveWorkoutHeader } from './live-workout-header'
import { ExerciseCard } from './exercise-card'
import { SetsTable } from './sets-table'
import { RestTimer } from './rest-timer'
import { ExerciseQueue } from './exercise-queue'
import { CardioMetricsForm } from './cardio-metrics-form'
import { useScreenWakeLock } from './use-screen-wake-lock'

type LiveWorkoutProps = {
  planId: string
  onMinimize: () => void
  onAbort: () => void
  onFinish: () => void
}

type SessionState = SessionClockState & {
  workoutId: string
  startedAt: number
  planId: string
  planName: string
  exercises: SessionExercise[]
  restTotalMs: number
}

const emptySet = (exercise?: SessionExercise): SetDraft => ({
  weight: String(exercise?.suggested.weight ?? 0),
  reps: String(exercise?.suggested.reps ?? 0),
  rir: 2,
})

export function LiveWorkout({ planId, onMinimize, onAbort, onFinish }: LiveWorkoutProps) {
  const [session, setSession] = useState<SessionState | null>(null)
  const [clockNow, setClockNow] = useState(() => Date.now())
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState<SetDraft>(emptySet())
  const [draftError, setDraftError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [recoveryWorkout, setRecoveryWorkout] = useState<Workout | null>(null)
  const [recoveryError, setRecoveryError] = useState('')
  const [isRecovering, setIsRecovering] = useState(false)
  const [persistenceError, setPersistenceError] = useState('')
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [finishError, setFinishError] = useState('')
  const isFinalizingRef = useRef(false)
  const persistenceQueueRef = useRef(Promise.resolve())
  const wakeLockStatus = useScreenWakeLock(Boolean(session && !session.paused))
  const [restSignal, setRestSignal] = useState<'none' | 'vibrate'>('vibrate')
  const [restSignalNotice, setRestSignalNotice] = useState('')
  const [bodyWeightKg, setBodyWeightKg] = useState<number | undefined>()
  const lastSignaledRestEnd = useRef<number | null>(null)

  useEffect(() => {
    let active = true

    void Promise.all([
      getPlans(),
      getExercises(),
      getWorkouts(),
      getProfile(),
      getExercisePreferences(),
      getLiveSessionSnapshot(),
    ])
      .then(([plans, exercises, workouts, profile, preferences, snapshot]) => {
        if (!active) return
        const currentWorkout = workouts.find((workout) => workout.status === 'in_progress')
        setRecoveryWorkout(currentWorkout ?? null)
        setRestSignal(profile?.settings.rest_timer_signal ?? 'vibrate')
        setBodyWeightKg(profile?.profile.weight_history.at(-1)?.weight_kg)
        const legacyPlanMatches = currentWorkout?.plan_id
          ? []
          : plans.filter((candidate) => candidate.name === currentWorkout?.plan_name)
        const plan = currentWorkout
          ? currentWorkout.plan_id
            ? plans.find((candidate) => candidate.id === currentWorkout.plan_id)
            : legacyPlanMatches.length === 1
              ? legacyPlanMatches[0]
              : undefined
          : plans.find((candidate) => candidate.id === planId)
        if (!plan) {
          setLoadError(
            currentWorkout
              ? 'Nie znaleziono jednoznacznego planu przypisanego do wznowionej sesji. Zakończ lub usuń tę sesję przed rozpoczęciem kolejnej.'
              : 'Nie znaleziono wybranego planu. Wróć do pulpitu i wybierz zapisany plan.',
          )
          setIsLoading(false)
          return
        }

        const matchingSnapshot =
          currentWorkout &&
          snapshot?.workout_id === currentWorkout.id &&
          snapshot.plan_id === plan.id
            ? snapshot
            : undefined
        if (
          matchingSnapshot &&
          (matchingSnapshot.exercise_ids.length !== plan.exercises.length ||
            matchingSnapshot.exercise_ids.some((id) => !exercises.some((exercise) => exercise.id === id)))
        ) {
          setLoadError('Zapisany stan sesji zawiera ćwiczenie, którego nie ma już w katalogu. Zakończ sesję, aby zachować zapisane serie.')
          setIsLoading(false)
          return
        }
        const sessionPlan = matchingSnapshot
          ? {
              ...plan,
              exercises: plan.exercises.map((planExercise, exerciseIndex) => ({
                ...planExercise,
                exercise_id: matchingSnapshot.exercise_ids[exerciseIndex] ?? planExercise.exercise_id,
              })),
            }
          : plan

        setLoadError('')
        const sessionExercises = buildSessionExercises(
          sessionPlan,
          exercises,
          workouts,
          profile?.settings.rest_timer_defaults,
          preferences,
        )
        const now = Date.now()
        const restoredIndex = matchingSnapshot
          ? Math.min(matchingSnapshot.exercise_index, sessionExercises.length - 1)
          : 0
        const snapshotAgeMs = matchingSnapshot ? Math.max(0, now - Date.parse(matchingSnapshot.updated_at)) : 0
        const paused = matchingSnapshot?.paused ?? Boolean(currentWorkout?.paused_at)
        const elapsedMs = matchingSnapshot
          ? matchingSnapshot.elapsed_ms + (paused ? 0 : snapshotAgeMs)
          : (currentWorkout?.paused_duration_ms ?? 0) +
            (paused
              ? 0
              : Math.max(
                  0,
                  now - Date.parse(currentWorkout?.updated_at ?? currentWorkout?.start_time ?? new Date(now).toISOString()),
                ))
        const restRemainingMs = matchingSnapshot
          ? paused
            ? matchingSnapshot.rest_remaining_ms
            : Math.max(0, matchingSnapshot.rest_remaining_ms - snapshotAgeMs)
          : 0
        const nextSession: SessionState = {
          workoutId: currentWorkout?.id ?? `live-session-${now}`,
          startedAt: currentWorkout?.start_time ? Date.parse(currentWorkout.start_time) : now,
          planId: plan.id,
          planName: plan.name,
          exercises: sessionExercises,
          elapsedMs,
          paused,
          runningSince: paused ? null : now,
          restEndsAt: !paused && restRemainingMs > 0 ? now + restRemainingMs : null,
          pausedRestRemainingMs: paused ? restRemainingMs : 0,
          restTotalMs: matchingSnapshot?.rest_total_ms ?? 0,
        }

        setSession(nextSession)
        setIndex(restoredIndex)
        setDraft(matchingSnapshot?.draft ?? emptySet(nextSession.exercises[restoredIndex]))
        setIsLoading(false)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setLoadError(cause instanceof Error ? cause.message : 'Nie udało się przygotować treningu.')
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [planId])

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!session || isFinalizingRef.current) return
    const savedAt = Date.now()
    const elapsedMs = getSessionElapsedMs(session, savedAt)
    const restRemainingMs = getSessionRestRemainingMs(session, savedAt)

    const persist = persistenceQueueRef.current.catch(() => undefined).then(async () => {
      if (isFinalizingRef.current) return
      await saveWorkout({
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
          note_during_workout: exercise.workoutNote,
          cardio: exercise.completedCardio,
        })),
        paused_at: session.paused ? new Date(savedAt).toISOString() : undefined,
        paused_duration_ms: elapsedMs,
      })
      await saveLiveSessionSnapshot({
        workout_id: session.workoutId,
        plan_id: session.planId,
        exercise_ids: session.exercises.map((exercise) => exercise.exercise_id),
        exercise_index: index,
        draft,
        paused: session.paused,
        elapsed_ms: elapsedMs,
        rest_remaining_ms: restRemainingMs,
        rest_total_ms: session.restTotalMs,
        updated_at: new Date(savedAt).toISOString(),
      })
    })
    persistenceQueueRef.current = persist.then(() => undefined, () => undefined)
    void persist
      .then(() => {
        if (!isFinalizingRef.current) setPersistenceError('')
      })
      .catch((cause: unknown) => {
        setPersistenceError(
          cause instanceof Error ? cause.message : 'Nie udało się zapisać bieżącego treningu.',
        )
      })
  }, [session, index, draft])

  useEffect(() => {
    if (!session || !session.restEndsAt) return
    const expiredEnd = getExpiredRestSignalEnd(
      session.restEndsAt,
      clockNow,
      lastSignaledRestEnd.current,
    )
    if (expiredEnd === null) return

    lastSignaledRestEnd.current = expiredEnd
    const vibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator
      ? () => navigator.vibrate(200)
      : undefined
    const result = sendRestCompletionSignal(restSignal, vibrate)
    setRestSignalNotice(
      result === 'unsupported' || result === 'unavailable'
        ? 'Przerwa się skończyła. Wibracja nie jest dostępna na tym urządzeniu.'
        : '',
    )
  }, [clockNow, restSignal, session])

  const exercise = session?.exercises[index] ?? null
  const sets = exercise?.completedSets ?? []
  const isLast = !!session && index === session.exercises.length - 1
  const totalTarget = session?.exercises.reduce((sum, item) => sum + item.targetSets, 0) ?? 0
  const completedCount = (item: SessionExercise) => item.isCardio
    ? item.completedCardio ? 1 : 0
    : item.completedSets.length
  const totalDone = session?.exercises.reduce((sum, item) => sum + completedCount(item), 0) ?? 0

  const togglePause = () => {
    const now = Date.now()
    setClockNow(now)
    setSession((current) => {
      if (!current) return current
      const paused = !current.paused
      const elapsedMs = getSessionElapsedMs(current, now)
      const remaining = getSessionRestRemainingMs(current, now)
      return {
        ...current,
        elapsedMs,
        paused,
        runningSince: paused ? null : now,
        restEndsAt: !paused && remaining > 0 ? now + remaining : null,
        pausedRestRemainingMs: paused ? remaining : 0,
      }
    })
  }

  const goTo = (next: number) => {
    if (!session) return
    const target = Math.max(0, Math.min(next, session.exercises.length - 1))
    setIndex(target)
    const nextExercise = session.exercises[target]
    const last = nextExercise.completedSets.at(-1)
    setDraft(
      last
        ? { weight: String(last.weight), reps: String(last.reps), rir: last.rir }
        : {
            weight: String(nextExercise.suggested.weight),
            reps: String(nextExercise.suggested.reps),
            rir: 2,
          },
    )
    setDraftError('')
    setSession((current) =>
      current
        ? {
            ...current,
            restEndsAt: null,
            pausedRestRemainingMs: 0,
            restTotalMs: nextExercise.restSeconds * 1000,
        }
        : current,
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const logSet = () => {
    if (!exercise || !session) return
    const parsedDraft = validateSetDraft(draft)
    if (!parsedDraft.success) {
      setDraftError(parsedDraft.error.issues[0]?.message ?? 'Popraw wartości serii.')
      return
    }
    setDraftError('')
    const restDurationMs = exercise.restSeconds * 1000
    const restEndsAt = Date.now() + restDurationMs

    setSession((current) => {
      if (!current) return current
      const exercises = current.exercises.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              completedSets: [...item.completedSets, parsedDraft.data],
            }
          : item,
      )

      return {
        ...current,
        exercises,
        restEndsAt: current.paused ? null : restEndsAt,
        pausedRestRemainingMs: current.paused ? restDurationMs : 0,
        restTotalMs: restDurationMs,
      }
    })

    setDraft({ weight: String(parsedDraft.data.weight), reps: String(parsedDraft.data.reps), rir: draft.rir })
  }

  const editSet = (setIndex: number, updatedSet: LoggedSet) => {
    setSession((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((item, itemIndex) =>
              itemIndex === index
                ? {
                    ...item,
                    completedSets: item.completedSets.map((set, currentSetIndex) =>
                      currentSetIndex === setIndex ? updatedSet : set,
                    ),
                  }
                : item,
            ),
          }
        : current,
    )
  }

  const deleteSet = (setIndex: number) => {
    setSession((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((item, itemIndex) =>
              itemIndex === index
                ? {
                    ...item,
                    completedSets: item.completedSets.filter((_, currentSetIndex) => currentSetIndex !== setIndex),
                  }
                : item,
            ),
          }
        : current,
    )
  }

  const updateWorkoutNote = (workoutNote: string) => {
    setSession((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((item, itemIndex) =>
              itemIndex === index ? { ...item, workoutNote } : item,
            ),
          }
        : current,
    )
  }

  const saveCardio = (cardio: CardioMetrics) => {
    const estimatedCalories = getCardioSummary(cardio, bodyWeightKg).caloriesKcal
    const savedCardio = cardio.calories_kcal === undefined && estimatedCalories !== undefined
      ? { ...cardio, calories_kcal: estimatedCalories }
      : cardio
    setSession((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((item, itemIndex) =>
              itemIndex === index ? { ...item, completedCardio: savedCardio } : item,
            ),
          }
        : current,
    )
  }

  const adjustRest = (deltaMs: number) => {
    if (!session) return
    const now = Date.now()
    setSession((current) => {
      if (!current) return current
      const remaining = Math.max(0, getSessionRestRemainingMs(current, now) + deltaMs)
      return {
        ...current,
        restEndsAt: !current.paused && remaining > 0 ? now + remaining : null,
        pausedRestRemainingMs: current.paused ? remaining : 0,
        restTotalMs: Math.max(current.restTotalMs, remaining),
      }
    })
  }

  const finishWorkout = async () => {
    if (!session || isFinalizingRef.current) return
    isFinalizingRef.current = true
    setIsFinishing(true)
    setFinishError('')
    const now = Date.now()

    try {
      await persistenceQueueRef.current
      const completedWorkout = {
        id: session.workoutId,
        start_time: new Date(session.startedAt).toISOString(),
        end_time: new Date(now).toISOString(),
        status: 'pending_finalization' as const,
        plan_name: session.planName,
        plan_id: session.planId,
        paused_duration_ms: getSessionElapsedMs(session, now),
        exercises: session.exercises.map((item) => ({
          exercise_id: item.exercise_id,
          exercise_name: item.name,
          sets: item.completedSets.map((set, setIndex) => ({
            set_number: setIndex + 1,
            weight_kg: set.weight,
            reps: set.reps,
            rir: set.rir,
          })),
          note_during_workout: item.workoutNote,
          cardio: item.completedCardio,
        })),
      }

      await saveWorkout(completedWorkout)
      await deleteLiveSessionSnapshot()
      setIsFinishDialogOpen(false)
      onFinish()
    } catch (cause) {
      setFinishError(cause instanceof Error ? cause.message : 'Nie udało się zapisać zakończonego treningu.')
    } finally {
      isFinalizingRef.current = false
      setIsFinishing(false)
    }
  }

  const finishInterruptedWorkout = async () => {
    if (!recoveryWorkout) return

    setRecoveryError('')
    setIsRecovering(true)
    try {
      await saveWorkout(
        prepareInterruptedWorkoutForFinalization(recoveryWorkout, new Date().toISOString()),
      )
      await deleteLiveSessionSnapshot()
      onFinish()
    } catch (cause) {
      setRecoveryError(
        cause instanceof Error ? cause.message : 'Nie udało się zachować przerwanego treningu.',
      )
    } finally {
      setIsRecovering(false)
    }
  }

  const restRemainingMs = session ? getSessionRestRemainingMs(session, clockNow) : 0
  const restTimer = session ? (
    <RestTimer
      remaining={Math.max(0, Math.ceil(restRemainingMs / 1000))}
      total={Math.max(1, Math.ceil(session.restTotalMs / 1000))}
      paused={session.paused}
      onAdjust={(delta) => adjustRest(delta * 1000)}
      onSkip={() =>
        setSession((current) =>
          current
            ? {
                ...current,
              restEndsAt: null,
              pausedRestRemainingMs: 0,
            }
            : current,
        )
      }
    />
  ) : null

  if (isLoading || !session || !exercise) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-4 py-12 text-center">
        {loadError ? (
          <>
            <p role="alert" className="text-sm text-destructive">{loadError}</p>
            {recoveryWorkout ? (
              <>
                <Button disabled={isRecovering} onClick={() => void finishInterruptedWorkout()}>
                  {isRecovering ? 'Zapisywanie…' : 'Zakończ i zachowaj zapisane dane'}
                </Button>
                {recoveryError ? (
                  <p role="alert" className="text-sm text-destructive">{recoveryError}</p>
                ) : null}
              </>
            ) : null}
            <Button variant="outline" onClick={onAbort}>Wróć do pulpitu</Button>
          </>
        ) : (
          <p role="status" className="text-muted-foreground">Ładowanie treningu…</p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-dvh">
      <LiveWorkoutHeader
        title={session.planName}
        elapsed={Math.max(0, Math.floor(getSessionElapsedMs(session, clockNow) / 1000))}
        paused={session.paused}
        position={`Ćwiczenie ${index + 1} z ${session.exercises.length}`}
        progress={Math.min(100, (totalDone / totalTarget) * 100 || 0)}
        onTogglePause={togglePause}
        onFinish={() => setIsFinishDialogOpen(true)}
        onMinimize={onMinimize}
      />

      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 md:px-8 md:py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          {persistenceError ? (
            <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Nie udało się zapisać bieżącego treningu: {persistenceError}
            </p>
          ) : null}
          {wakeLockStatus === 'unsupported' || wakeLockStatus === 'error' ? (
            <p role="status" className="rounded-xl border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
              {wakeLockStatus === 'unsupported'
                ? 'Ta przeglądarka może wygasić ekran podczas treningu.'
                : 'Nie udało się utrzymać ekranu włączonego. Trening nadal działa i jest zapisywany.'}
            </p>
          ) : null}
          {restSignalNotice ? (
            <p role="status" className="rounded-xl border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
              {restSignalNotice}
            </p>
          ) : null}
          <ExerciseCard
            key={`${exercise.exercise_id}-${index}`}
            name={exercise.name}
            note={exercise.note}
            workoutNote={exercise.workoutNote}
            onWorkoutNoteChange={updateWorkoutNote}
            lastTime={exercise.lastTime}
            targetSets={exercise.targetSets}
            targetReps={exercise.targetReps}
            doneSets={completedCount(exercise)}
            hasAlternatives={exercise.alternatives.length > 0}
            onSwap={() => {
              const alternative = exercise.alternatives[0]
              if (!alternative || completedCount(exercise) > 0) return
              const previousExercise = {
                id: exercise.id,
                name: exercise.name,
                note: exercise.note,
                restSeconds: exercise.restSeconds,
                suggested: exercise.suggested,
                lastTime: exercise.lastTime,
                isCardio: exercise.isCardio,
              }
              setSession((current) => {
                if (!current) return current
                const updatedExercises = current.exercises.map((item, itemIndex) =>
                  itemIndex === index
                    ? {
                        ...item,
                        ...alternative,
                        id: alternative.id,
                        exercise_id: alternative.id,
                        alternatives: [...item.alternatives.slice(1), previousExercise],
                      }
                    : item,
                )
                return {
                  ...current,
                  exercises: updatedExercises,
                  restEndsAt: null,
                  pausedRestRemainingMs: 0,
                  restTotalMs: alternative.restSeconds * 1000,
                }
              })
              setDraft({
                weight: String(alternative.suggested.weight),
                reps: String(alternative.suggested.reps || exercise.targetReps.match(/\d+/)?.[0] || '8'),
                rir: 2,
              })
              setDraftError('')
            }}
          />
          <div className="lg:hidden">{restTimer}</div>
          {exercise.isCardio ? (
            <CardioMetricsForm
              key={`${exercise.exercise_id}-${index}`}
              value={exercise.completedCardio}
              bodyWeightKg={bodyWeightKg}
              onSave={saveCardio}
            />
          ) : (
            <SetsTable
              sets={sets}
              targetSets={exercise.targetSets}
              targetReps={exercise.targetReps}
              draft={draft}
              onDraftChange={(nextDraft) => {
                setDraft(nextDraft)
                setDraftError('')
              }}
              draftError={draftError}
              onLogSet={logSet}
              onEditSet={editSet}
              onDeleteSet={deleteSet}
            />
          )}
        </div>

        <aside className="hidden flex-col gap-4 lg:flex">
          {restTimer}
          <ExerciseQueue
            exercises={session.exercises}
            completedCounts={session.exercises.map(completedCount)}
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
            onClick={() => (isLast ? setIsFinishDialogOpen(true) : goTo(index + 1))}
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

      {isFinishDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isFinishing) {
              setIsFinishDialogOpen(false)
              setFinishError('')
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="finish-workout-title"
            aria-describedby="finish-workout-description"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !isFinishing) {
                setIsFinishDialogOpen(false)
                setFinishError('')
              }
            }}
          >
            <h2 id="finish-workout-title" className="text-lg font-semibold">
              Zakończyć trening?
            </h2>
            <p id="finish-workout-description" className="mt-2 text-sm text-muted-foreground">
              Zapisane ćwiczenia i serie zostaną zachowane, a trening będzie oczekiwał na finalizację.
            </p>
            {finishError ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                Nie udało się zakończyć treningu: {finishError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isFinishing}
                autoFocus
                onClick={() => {
                  setIsFinishDialogOpen(false)
                  setFinishError('')
                }}
              >
                Wróć do treningu
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isFinishing}
                onClick={() => void finishWorkout()}
              >
                {isFinishing ? 'Zapisywanie…' : 'Zakończ trening'}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
