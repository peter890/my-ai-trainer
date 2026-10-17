import { describe, expect, it } from 'vitest'
import { createWorkoutLogs, groupWorkoutLogsByDate } from './workout-history'

function makeWorkout(id: string, startTime: string, planName: string) {
  return {
    id,
    start_time: startTime,
    end_time: new Date(Date.parse(startTime) + 60 * 60 * 1000).toISOString(),
    status: 'completed' as const,
    plan_name: planName,
    paused_duration_ms: 0,
    exercises: [],
  }
}

describe('workout history mapping', () => {
  it('preserves multiple sessions on the same local date with distinct IDs and times', () => {
    const first = new Date(2026, 9, 14, 8, 0)
    const second = new Date(2026, 9, 14, 18, 30)
    const logs = createWorkoutLogs([
      makeWorkout('morning', first.toISOString(), 'Push A'),
      makeWorkout('evening', second.toISOString(), 'Pull B'),
    ])

    const sameDay = groupWorkoutLogsByDate(logs).get('2026-10-14')
    expect(sameDay).toHaveLength(2)
    expect(sameDay?.map((log) => log.id)).toEqual(['evening', 'morning'])
    expect(sameDay?.map((log) => log.time)).toEqual([
      new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(second),
      new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(first),
    ])
  })

  it('includes the year in the date key and omits workouts still in progress', () => {
    const startedAt = new Date(2026, 0, 2, 8, 0)
    const logs = createWorkoutLogs([
      makeWorkout('done', startedAt.toISOString(), 'Nogi'),
      {
        ...makeWorkout('active', startedAt.toISOString(), 'Push'),
        status: 'in_progress' as const,
        end_time: undefined,
      },
    ])

    expect(logs).toHaveLength(1)
    expect(logs[0]?.date).toBe('2026-01-02')
  })
})
