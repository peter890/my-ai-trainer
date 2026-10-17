import { describe, expect, it } from 'vitest'
import { createWorkoutSurveyUpdate, getPendingFinalizationWorkouts } from './post-workout'
import { WorkoutSchema } from './schemas'

function makeWorkout(id: string, status: 'completed' | 'pending_finalization', startTime: string) {
  return WorkoutSchema.parse({
    id,
    start_time: startTime,
    end_time: startTime,
    status,
    plan_name: id,
    exercises: [],
  })
}

describe('post-workout finalization', () => {
  it('orders every pending workout from oldest to newest', () => {
    const workouts = [
      makeWorkout('newest', 'pending_finalization', '2026-10-16T12:00:00.000Z'),
      makeWorkout('completed', 'completed', '2026-10-14T12:00:00.000Z'),
      makeWorkout('oldest', 'pending_finalization', '2026-10-15T12:00:00.000Z'),
    ]

    expect(getPendingFinalizationWorkouts(workouts).map((workout) => workout.id)).toEqual([
      'oldest',
      'newest',
    ])
  })

  it('validates and trims survey answers while keeping the workout pending', () => {
    const workout = makeWorkout('pending', 'pending_finalization', '2026-10-16T12:00:00.000Z')
    expect(createWorkoutSurveyUpdate(workout, 4, '  Dobra energia  ')).toMatchObject({
      id: 'pending',
      status: 'pending_finalization',
      readiness_energy_score: 4,
      post_workout_user_notes: 'Dobra energia',
    })
    expect(() => createWorkoutSurveyUpdate(workout, 6, 'Notatka')).toThrow()
    expect(() => createWorkoutSurveyUpdate(workout, 3, 'x'.repeat(4001))).toThrow()
  })
})
