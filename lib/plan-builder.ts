import { WorkoutPlanSchema, type WorkoutType } from './schemas'

export type GeneratedPlanDay = {
  name: string
  exercises: {
    id: string
    restType: 'heavy_compound' | 'moderate_compound' | 'isolation' | 'cardio'
    scheme: string
  }[]
}

function getWorkoutType(name: string): WorkoutType {
  const normalizedName = name.toLowerCase()
  if (normalizedName.includes('pull')) return 'pull'
  if (normalizedName.includes('leg') || normalizedName.includes('lower')) return 'legs'
  if (normalizedName.includes('cardio')) return 'cardio'
  return 'push'
}

export function createWorkoutPlan(
  day: GeneratedPlanDay,
  id: string,
  timestamp: string,
) {
  return WorkoutPlanSchema.parse({
    id,
    name: day.name,
    type: getWorkoutType(day.name),
    exercises: day.exercises.map((exercise, order) => {
      const [setsPart, repsPart] = exercise.scheme.split(/\s*[x×]\s*/i).map((part) => part.trim())
      const targetSets = Number.parseInt(setsPart?.match(/\d+/)?.[0] ?? '', 10)
      const targetReps = repsPart?.replace(/[–—]/g, '-').replace(/[^\d-]/g, '') ?? ''
      return {
        exercise_id: exercise.id,
        order,
        target_sets: targetSets,
        target_reps: targetReps,
        rest_type: exercise.restType,
      }
    }),
    created_at: timestamp,
    updated_at: timestamp,
  })
}
