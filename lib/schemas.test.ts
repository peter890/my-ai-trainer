import { describe, expect, it } from 'vitest'
import { AiAnalysisFeedbackSchema, ProfileDocumentSchema, WorkoutSchema } from './schemas'

const profile = {
  version: '1.0',
  updated_at: '2026-10-14T18:30:00.000Z',
  profile: {
    gender: 'male',
    age: 30,
    height_cm: 180,
    weight_history: [{ date: '2026-10-14', weight_kg: 81.8 }],
    experience_level: 'intermediate',
    primary_goal: 'hypertrophy',
  },
  exercise_preferences: {
    excluded_exercise_ids: [],
    favorite_exercise_ids: ['bench_press'],
    custom_exercises: [],
  },
  settings: {
    rest_timer_defaults: {
      heavy_compound: 180,
      moderate_compound: 120,
      isolation: 60,
      isometric: 45,
    },
  },
}

describe('ProfileDocumentSchema', () => {
  it('validates profile data and supplies default injury notes', () => {
    const result = ProfileDocumentSchema.parse(profile)

    expect(result.profile.injuries_notes).toBe('')
    expect(result.settings.rest_timer_signal).toBe('vibrate')
  })

  it('rejects an API key so it cannot enter synchronized profile data', () => {
    expect(() => ProfileDocumentSchema.parse({ ...profile, settings: { ...profile.settings, gemini_api_key: 'secret' } })).toThrow()
  })

  it('rejects invalid calendar dates and measurements', () => {
    expect(
      ProfileDocumentSchema.safeParse({
        ...profile,
        profile: {
          ...profile.profile,
          weight_history: [{ date: '2026-02-30', weight_kg: 81.8 }],
        },
      }).success,
    ).toBe(false)
    expect(
      ProfileDocumentSchema.safeParse({
        ...profile,
        profile: { ...profile.profile, height_cm: -1 },
      }).success,
    ).toBe(false)
  })

  it('rejects an exercise marked as both favorite and excluded', () => {
    expect(
      ProfileDocumentSchema.safeParse({
        ...profile,
        exercise_preferences: {
          ...profile.exercise_preferences,
          favorite_exercise_ids: ['bench_press'],
          excluded_exercise_ids: ['bench_press'],
        },
      }).success,
    ).toBe(false)
  })
})

describe('WorkoutSchema', () => {
  const workout = {
    id: 'workout-1',
    start_time: '2026-10-14T18:30:00.000Z',
    status: 'in_progress',
    plan_name: 'Push A',
    exercises: [
      {
        exercise_id: 'bench_press',
        exercise_name: 'Wyciskanie sztangi leżąc',
        sets: [{ set_number: 1, weight_kg: 80, reps: 8, rir: 2 }],
      },
    ],
  }

  it('accepts an active workout and defaults accumulated pause duration', () => {
    expect(WorkoutSchema.parse(workout).paused_duration_ms).toBe(0)
  })

  describe('AiAnalysisFeedbackSchema', () => {
    it('accepts the 150-word response limit and rejects the next word', () => {
      expect(AiAnalysisFeedbackSchema.safeParse(Array.from({ length: 150 }, () => 'słowo').join(' ')).success).toBe(
        true,
      )
      expect(AiAnalysisFeedbackSchema.safeParse(Array.from({ length: 151 }, () => 'słowo').join(' ')).success).toBe(
        false,
      )
    })
  })

  it('requires end_time for a workout awaiting finalization', () => {
    expect(WorkoutSchema.safeParse({ ...workout, status: 'pending_finalization' }).success).toBe(false)
  })
})
