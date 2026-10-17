import { WorkoutSchema, type Workout } from './schemas'

export function getPendingFinalizationWorkouts(workouts: Workout[]): Workout[] {
  return workouts
    .filter((workout) => workout.status === 'pending_finalization')
    .sort((left, right) => Date.parse(left.start_time) - Date.parse(right.start_time))
}

export function createWorkoutSurveyUpdate(
  workout: Workout,
  energy: number,
  notes: string,
): Workout {
  return WorkoutSchema.parse({
    ...workout,
    readiness_energy_score: energy,
    post_workout_user_notes: notes.trim() || undefined,
  })
}
