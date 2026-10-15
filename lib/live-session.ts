import type { Exercise, RestType, Workout, WorkoutPlan } from './schemas'
import type { LoggedSet } from './trainer-data'

export type SessionExercise = {
  id: string
  exercise_id: string
  name: string
  alternatives: string[]
  note: string
  lastTime: string
  targetSets: number
  targetReps: string
  restSeconds: number
  suggested: { weight: number; reps: number }
  completedSets: LoggedSet[]
}

const restSecondsByType: Record<RestType, number> = {
  heavy_compound: 180,
  moderate_compound: 120,
  isolation: 90,
  cardio: 60,
}

function formatLastTime(sets: LoggedSet[]): string {
  if (sets.length === 0) return 'Brak danych'
  return sets
    .slice(-3)
    .map((set) => `${set.weight} kg × ${set.reps}`)
    .join(', ')
}

export function buildSessionExercises(
  plan: WorkoutPlan,
  exercises: Exercise[],
  workouts: Workout[],
): SessionExercise[] {
  const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]))

  return plan.exercises.map((planExercise) => {
    const exercise = catalog.get(planExercise.exercise_id)
    const relatedSets: LoggedSet[] = workouts.flatMap((workout) =>
      workout.exercises
        .filter((entry) => entry.exercise_id === planExercise.exercise_id)
        .flatMap((entry) =>
          entry.sets.map((set) => ({
            weight: set.weight_kg,
            reps: set.reps,
            rir: set.rir ?? 2,
          })),
        ),
    )

    const lastSet = relatedSets.at(-1)
    const suggestedWeight = lastSet ? Number(lastSet.weight.toFixed(1)) : 0
    const suggestedReps = lastSet ? lastSet.reps : Number.parseInt(planExercise.target_reps.match(/\d+/)?.[0] ?? '8', 10)

    return {
      id: planExercise.exercise_id,
      exercise_id: planExercise.exercise_id,
      name: exercise?.name ?? `Ćwiczenie ${planExercise.order + 1}`,
      alternatives: [],
      note: exercise?.technique_note ?? 'Brak notatki technicznej; uzupełnij opis ćwiczenia.',
      lastTime: formatLastTime(relatedSets),
      targetSets: planExercise.target_sets,
      targetReps: planExercise.target_reps,
      restSeconds: restSecondsByType[exercise?.rest_type ?? 'moderate_compound'],
      suggested: { weight: suggestedWeight, reps: suggestedReps },
      completedSets: [],
    }
  })
}
