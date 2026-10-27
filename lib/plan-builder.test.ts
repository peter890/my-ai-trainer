import { describe, expect, it } from 'vitest'
import { createWorkoutPlan } from './plan-builder'

describe('createWorkoutPlan', () => {
  it('converts a generated day into a validated editable workout plan', () => {
    expect(
      createWorkoutPlan(
        {
          name: 'Pull A',
          exercises: [
            { id: 'lat-pulldown', restType: 'moderate_compound', scheme: '3 x 8-12' },
            { id: 'face-pull', restType: 'isolation', scheme: '3 × 8–12' },
          ],
        },
        'plan-1',
        '2026-10-16T12:00:00.000Z',
      ),
    ).toEqual({
      id: 'plan-1',
      name: 'Pull A',
      type: 'pull',
      exercises: [
        {
          exercise_id: 'lat-pulldown',
          order: 0,
          target_sets: 3,
          target_reps: '8-12',
          rest_type: 'moderate_compound',
        },
        {
          exercise_id: 'face-pull',
          order: 1,
          target_sets: 3,
          target_reps: '8-12',
          rest_type: 'isolation',
        },
      ],
      created_at: '2026-10-16T12:00:00.000Z',
      updated_at: '2026-10-16T12:00:00.000Z',
    })
  })

  it('rejects a generated day that cannot become a valid plan', () => {
    expect(() =>
      createWorkoutPlan({ name: 'Push', exercises: [] }, 'plan-empty', '2026-10-16T12:00:00.000Z'),
    ).toThrow()
  })

  it('converts a cardio duration scheme into a valid plan exercise', () => {
    expect(
      createWorkoutPlan(
        {
          name: 'Cardio A',
          exercises: [{ id: 'treadmill', restType: 'cardio', scheme: '1 x 20 min' }],
        },
        'plan-cardio',
        '2026-10-16T12:00:00.000Z',
      ).exercises[0],
    ).toMatchObject({
      exercise_id: 'treadmill',
      target_sets: 1,
      target_reps: '20',
      rest_type: 'cardio',
    })
  })
})
