import { describe, expect, it } from 'vitest'
import { createWorkoutProgressSeries } from './workout-progress'
import type { WeightEntry, Workout } from './schemas'

function makeWorkout(id: string, startTime: Date, sets: Array<{ weight: number; reps: number }>): Workout {
  return {
    id,
    start_time: startTime.toISOString(),
    end_time: new Date(startTime.getTime() + 45 * 60 * 1000).toISOString(),
    status: 'completed',
    plan_name: 'Push A',
    paused_duration_ms: 0,
    exercises: [
      {
        exercise_id: 'bench',
        exercise_name: 'Wyciskanie',
        note_during_workout: '',
        sets: sets.map((set, index) => ({
          set_number: index + 1,
          weight_kg: set.weight,
          reps: set.reps,
        })),
      },
    ],
  }
}

describe('createWorkoutProgressSeries', () => {
  it('joins body-weight measurements with daily workout volume from local data', () => {
    const weightHistory: WeightEntry[] = [
      { date: '2026-10-10', weight_kg: 82.4 },
      { date: '2026-10-12', weight_kg: 82.1 },
    ]
    const workouts: Workout[] = [
      makeWorkout('w1', new Date(2026, 9, 10, 9), [
        { weight: 80, reps: 8 },
        { weight: 80, reps: 8 },
      ]),
      makeWorkout('w2', new Date(2026, 9, 11, 18), [{ weight: 100, reps: 5 }]),
    ]

    const result = createWorkoutProgressSeries(weightHistory, workouts)

    expect(result.weight_volume_points).toEqual([
      { date: '2026-10-10', label: '10.10', weight_kg: 82.4, volume_kg: 1280 },
      { date: '2026-10-11', label: '10.11', weight_kg: null, volume_kg: 500 },
      { date: '2026-10-12', label: '10.12', weight_kg: 82.1, volume_kg: null },
    ])
  })

  it('calculates strength progression as best estimated 1RM per day (Epley)', () => {
    const workouts: Workout[] = [
      makeWorkout('w1', new Date(2026, 9, 10, 9), [
        { weight: 90, reps: 5 },
        { weight: 92.5, reps: 4 },
      ]),
      makeWorkout('w2', new Date(2026, 9, 10, 19), [{ weight: 100, reps: 2 }]),
      {
        ...makeWorkout('active', new Date(2026, 9, 11, 10), [{ weight: 80, reps: 8 }]),
        status: 'in_progress',
        end_time: undefined,
      },
    ]

    const result = createWorkoutProgressSeries([], workouts)

    expect(result.strength_progress_points).toEqual([
      {
        date: '2026-10-10',
        label: '10.10',
        estimated_1rm_kg: 106.7,
      },
    ])
  })

  it('aggregates volume from multiple sessions on the same day and keeps chronological order across year boundary', () => {
    const weightHistory: WeightEntry[] = [
      { date: '2026-12-31', weight_kg: 83.1 },
      { date: '2027-01-01', weight_kg: 82.9 },
    ]

    const workouts: Workout[] = [
      makeWorkout('last-day-a', new Date(2026, 11, 31, 8), [{ weight: 80, reps: 5 }]),
      makeWorkout('last-day-b', new Date(2026, 11, 31, 18), [{ weight: 60, reps: 10 }]),
      makeWorkout('new-year', new Date(2027, 0, 1, 9), [{ weight: 90, reps: 3 }]),
    ]

    const result = createWorkoutProgressSeries(weightHistory, workouts)

    expect(result.weight_volume_points).toEqual([
      { date: '2026-12-31', label: '12.31', weight_kg: 83.1, volume_kg: 1000 },
      { date: '2027-01-01', label: '01.01', weight_kg: 82.9, volume_kg: 270 },
    ])
  })
})
