import { z } from 'zod'
import { getExerciseAlternatives, toExerciseView } from './exercise-catalog'
import type { CardioMetrics, Exercise, ProfileDocument, RestType, Workout, WorkoutPlan } from './schemas'
import type { ExercisePreferences } from './schemas'
import { WorkoutSchema } from './schemas'
import type { LoggedSet } from './trainer-data'

export type SessionAlternative = {
  id: string
  name: string
  note: string
  restSeconds: number
  suggested: { weight: number; reps: number }
  lastTime: string
  isCardio: boolean
}

export type SessionExercise = {
  id: string
  exercise_id: string
  name: string
  alternatives: SessionAlternative[]
  note: string
  workoutNote: string
  lastTime: string
  targetSets: number
  targetReps: string
  restSeconds: number
  suggested: { weight: number; reps: number }
  completedSets: LoggedSet[]
  completedCardio?: CardioMetrics
  isCardio: boolean
}

const restSecondsByType: Record<RestType, number> = {
  heavy_compound: 180,
  moderate_compound: 120,
  isolation: 60,
  cardio: 60,
}

type RestTimerDefaults = ProfileDocument['settings']['rest_timer_defaults']

export type SetDraft = {
  weight: string
  reps: string
  rir: number
}

export type SessionClockState = {
  elapsedMs: number
  paused: boolean
  runningSince: number | null
  restEndsAt: number | null
  pausedRestRemainingMs: number
}

export function getSessionElapsedMs(state: SessionClockState, now: number): number {
  const activeDuration = state.paused || state.runningSince === null
    ? 0
    : Math.max(0, now - state.runningSince)
  return state.elapsedMs + activeDuration
}

export function getSessionRestRemainingMs(state: SessionClockState, now: number): number {
  if (state.paused) return state.pausedRestRemainingMs
  if (state.restEndsAt === null) return 0
  return Math.max(0, state.restEndsAt - now)
}

const SetDraftSchema = z
  .object({
    weight: z
      .string()
      .trim()
      .min(1, 'Wpisz ciężar.')
      .regex(/^\d+(?:[.,]\d{1,2})?$/, 'Podaj poprawny ciężar, np. 52,5.')
      .transform((value) => Number(value.replace(',', '.')))
      .pipe(z.number().min(0, 'Ciężar nie może być ujemny.').max(2000, 'Maksymalny ciężar to 2000 kg.')),
    reps: z
      .string()
      .trim()
      .min(1, 'Wpisz liczbę powtórzeń.')
      .regex(/^\d+$/, 'Liczba powtórzeń musi być liczbą całkowitą.')
      .transform(Number)
      .pipe(z.number().int().min(1, 'Wykonaj co najmniej jedno powtórzenie.').max(1000)),
    rir: z.number().int().min(0).max(4),
  })
  .strict()

export function validateSetDraft(draft: SetDraft) {
  return SetDraftSchema.safeParse(draft)
}

function formatLastTime(sets: LoggedSet[]): string {
  if (sets.length === 0) return 'Brak danych'
  return sets
    .slice(-3)
    .map((set) => `${set.weight} kg × ${set.reps}`)
    .join(', ')
}

function getRestSeconds(exercise: Exercise, restTimerDefaults?: RestTimerDefaults): number {
  if (exercise.rest_type === 'cardio') return restSecondsByType.cardio
  return restTimerDefaults?.[exercise.rest_type] ?? restSecondsByType[exercise.rest_type]
}

function getExercisePerformance(
  exerciseId: string,
  currentWorkout: Workout | undefined,
  historicalWorkouts: Workout[],
) {
  const loggedSets = (sets: Workout['exercises'][number]['sets']): LoggedSet[] =>
    [...sets]
      .sort((left, right) => left.set_number - right.set_number)
      .map((set) => ({
        weight: set.weight_kg,
        reps: set.reps,
        rir: set.rir ?? 2,
      }))
  const currentSets = loggedSets(
    currentWorkout?.exercises.find((entry) => entry.exercise_id === exerciseId)?.sets ?? [],
  )
  const latestHistoricalSets = historicalWorkouts
    .map((workout) => workout.exercises.find((entry) => entry.exercise_id === exerciseId))
    .find((entry) => entry && entry.sets.length > 0)
  const historicalSets = loggedSets(latestHistoricalSets?.sets ?? [])
  const lastSet = currentSets.at(-1) ?? historicalSets.at(-1)

  return {
    currentSets,
    historicalSets,
    suggested: {
      weight: lastSet ? Number(lastSet.weight.toFixed(1)) : 0,
      reps: lastSet ? lastSet.reps : 0,
    },
    lastTime: formatLastTime(historicalSets),
  }
}

export function getWorkoutPlanCatalogError(plan: WorkoutPlan, exercises: Exercise[]): string | undefined {
  if (exercises.length === 0) {
    return 'Katalog ćwiczeń jest pusty. Dodaj lub aktywuj ćwiczenia przed rozpoczęciem treningu.'
  }
  if (plan.exercises.length === 0) {
    return `Plan „${plan.name}” nie zawiera ćwiczeń. Edytuj plan przed rozpoczęciem treningu.`
  }

  const catalogIds = new Set(exercises.map((exercise) => exercise.id))
  const missingExercise = plan.exercises.find((planExercise) => !catalogIds.has(planExercise.exercise_id))
  if (missingExercise) {
    return `Ćwiczenie o ID „${missingExercise.exercise_id}” z planu „${plan.name}” nie istnieje w katalogu. Edytuj plan przed rozpoczęciem treningu.`
  }

  return undefined
}

export function prepareInterruptedWorkoutForFinalization(workout: Workout, endTime: string): Workout {
  return WorkoutSchema.parse({
    ...workout,
    status: 'pending_finalization',
    end_time: endTime,
  })
}

export function buildSessionExercises(
  plan: WorkoutPlan,
  exercises: Exercise[],
  workouts: Workout[],
  restTimerDefaults?: RestTimerDefaults,
  preferences?: ExercisePreferences,
): SessionExercise[] {
  const catalogError = getWorkoutPlanCatalogError(plan, exercises)
  if (catalogError) throw new Error(catalogError)
  const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const currentWorkout = workouts.find(
    (workout) =>
      workout.status === 'in_progress' &&
      (workout.plan_id ? workout.plan_id === plan.id : workout.plan_name === plan.name),
  )
  const historicalWorkouts = workouts
    .filter((workout) => workout.status !== 'in_progress')
    .sort((left, right) => Date.parse(right.start_time) - Date.parse(left.start_time))
  const effectivePreferences = preferences ?? {
    excluded_exercise_ids: [],
    favorite_exercise_ids: [],
  }
  const exerciseViews = exercises.map((exercise) => toExerciseView(exercise, effectivePreferences))
  const alternativesByExerciseId = new Map(
    exercises.map((exercise) => [
      exercise.id,
      getExerciseAlternatives(exerciseViews, exercise.id)
        .map((alternative) => catalog.get(alternative.id))
        .filter((alternative): alternative is Exercise => Boolean(alternative)),
    ]),
  )

  return plan.exercises.map((planExercise) => {
    const exercise = catalog.get(planExercise.exercise_id)!
    const performance = getExercisePerformance(
      exercise.id,
      currentWorkout,
      historicalWorkouts,
    )
    const currentExercise = currentWorkout?.exercises.find(
      (entry) => entry.exercise_id === exercise.id,
    )
    const suggestedReps =
      performance.suggested.reps || Number.parseInt(planExercise.target_reps.match(/\d+/)?.[0] ?? '8', 10)
    const alternatives = (alternativesByExerciseId.get(exercise.id) ?? []).map((alternative) => {
      const alternativePerformance = getExercisePerformance(
        alternative.id,
        currentWorkout,
        historicalWorkouts,
      )
      return {
        id: alternative.id,
        name: alternative.name,
        note: alternative.technique_note || 'Brak notatki technicznej; uzupełnij opis ćwiczenia.',
        restSeconds: getRestSeconds(alternative, restTimerDefaults),
        suggested: alternativePerformance.suggested,
        lastTime: alternativePerformance.lastTime,
        isCardio: alternative.category === 'cardio' || alternative.rest_type === 'cardio',
      }
    })

    return {
      id: exercise.id,
      exercise_id: exercise.id,
      name: exercise.name,
      alternatives,
      note: exercise?.technique_note ?? 'Brak notatki technicznej; uzupełnij opis ćwiczenia.',
      workoutNote: currentExercise?.note_during_workout ?? '',
      lastTime: performance.lastTime,
      targetSets: exercise.category === 'cardio' || exercise.rest_type === 'cardio' ? 1 : planExercise.target_sets,
      targetReps: planExercise.target_reps,
      restSeconds: getRestSeconds(exercise, restTimerDefaults),
      suggested: { weight: performance.suggested.weight, reps: suggestedReps },
      completedSets: performance.currentSets,
      completedCardio: currentExercise?.cardio,
      isCardio: exercise.category === 'cardio' || exercise.rest_type === 'cardio',
    }
  })
}

export function buildFreeSessionExercise(
  exerciseId: string,
  exercises: Exercise[],
  workouts: Workout[],
  restTimerDefaults?: RestTimerDefaults,
  preferences?: ExercisePreferences,
): SessionExercise {
  const exercise = exercises.find((candidate) => candidate.id === exerciseId)
  if (!exercise) throw new Error(`Ćwiczenie o ID „${exerciseId}” nie istnieje w katalogu.`)

  const timestamp = new Date(0).toISOString()
  const freePlan: WorkoutPlan = {
    id: 'free-session',
    name: 'Trening swobodny',
    type: 'push',
    exercises: [
      {
        exercise_id: exercise.id,
        order: 0,
        target_sets: 1,
        target_reps: 'Bez celu',
        rest_type: exercise.rest_type,
      },
    ],
    created_at: timestamp,
    updated_at: timestamp,
  }

  return buildSessionExercises(freePlan, exercises, workouts, restTimerDefaults, preferences)[0]!
}
