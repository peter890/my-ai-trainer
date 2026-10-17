import { describe, expect, it } from 'vitest'
import { calculateWorkoutDashboardStats } from './workout-stats'

function makeWorkout(id: string, startTime: Date, endTime: Date) {
  return {
    id,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: 'completed' as const,
    plan_name: 'Push A',
    paused_duration_ms: 10 * 60 * 1000,
    exercises: [
      {
        exercise_id: 'bench',
        exercise_name: 'Wyciskanie',
        note_during_workout: '',
        sets: [
          { set_number: 1, weight_kg: 50, reps: 10 },
          { set_number: 2, weight_kg: 55, reps: 8 },
        ],
      },
    ],
  }
}

describe('calculateWorkoutDashboardStats', () => {
  it('calculates this Monday-to-Sunday week and consecutive active weeks', () => {
    const now = new Date(2026, 9, 14, 12)
    const currentStart = new Date(2026, 9, 12, 8)
    const previousStart = new Date(2026, 9, 5, 8)
    const currentWorkout = makeWorkout(
      'current',
      currentStart,
      new Date(currentStart.getTime() + 60 * 60 * 1000),
    )
    const previousWorkout = makeWorkout(
      'previous',
      previousStart,
      new Date(previousStart.getTime() + 60 * 60 * 1000),
    )
    const stats = calculateWorkoutDashboardStats([currentWorkout, previousWorkout], now)

    expect(stats.streak_weeks).toBe(2)
    expect(stats.current_week).toEqual({
      workout_count: 1,
      volume_kg: 940,
      duration_minutes: 50,
      set_count: 2,
    })
    expect(stats.week_activity).toHaveLength(7)
    expect(stats.week_activity[0]).toMatchObject({ has_workout: true, is_today: false })
    expect(stats.week_activity[2]).toMatchObject({ label: 'Śr', is_today: true })
  })

  it('resets the streak immediately when the current week has no workout', () => {
    const now = new Date(2026, 9, 14, 12)
    const previousStart = new Date(2026, 9, 5, 8)
    const previousWorkout = makeWorkout(
      'previous',
      previousStart,
      new Date(previousStart.getTime() + 60 * 60 * 1000),
    )

    expect(calculateWorkoutDashboardStats([previousWorkout], now).streak_weeks).toBe(0)
  })

  it('does not count active workouts as history or weekly activity', () => {
    const now = new Date(2026, 9, 14, 12)
    const activeWorkout = {
      ...makeWorkout('active', now, new Date(now.getTime() + 60 * 60 * 1000)),
      status: 'in_progress' as const,
      end_time: undefined,
    }

    expect(calculateWorkoutDashboardStats([activeWorkout], now).current_week.workout_count).toBe(0)
  })
})
