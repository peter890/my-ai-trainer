import { describe, expect, it } from 'vitest'
import {
  buildSessionExercises,
  buildFreeSessionExercise,
  getSessionElapsedMs,
  getSessionRestRemainingMs,
  getWorkoutPlanCatalogError,
  prepareInterruptedWorkoutForFinalization,
  validateSetDraft,
} from './live-session'
import { ExerciseSchema, WorkoutPlanSchema, WorkoutSchema } from './schemas'

const plan = WorkoutPlanSchema.parse({
  id: 'push-a',
  name: 'Push A',
  type: 'push',
  exercises: [
    {
      exercise_id: 'bench-press',
      order: 0,
      target_sets: 3,
      target_reps: '8-10',
      rest_type: 'heavy_compound',
    },
  ],
  created_at: '2026-10-16T12:00:00.000Z',
  updated_at: '2026-10-16T12:00:00.000Z',
})

const benchPress = ExerciseSchema.parse({
  id: 'bench-press',
  name: 'Wyciskanie sztangi leżąc',
  active: true,
  category: 'chest',
  equipment: 'barbell',
  rest_type: 'heavy_compound',
  technique_note: 'Kontroluj opuszczanie.',
  custom: false,
})

describe('live session plan resolution', () => {
  it('derives elapsed workout and rest time from timestamps, including pause boundaries', () => {
    expect(
      getSessionElapsedMs(
        {
          elapsedMs: 10_000,
          paused: false,
          runningSince: 20_000,
          restEndsAt: 30_000,
          pausedRestRemainingMs: 0,
        },
        27_500,
      ),
    ).toBe(17_500)
    expect(
      getSessionElapsedMs(
        {
          elapsedMs: 17_500,
          paused: true,
          runningSince: null,
          restEndsAt: null,
          pausedRestRemainingMs: 2_500,
        },
        50_000,
      ),
    ).toBe(17_500)
    expect(
      getSessionRestRemainingMs(
        {
          elapsedMs: 0,
          paused: false,
          runningSince: 0,
          restEndsAt: 30_000,
          pausedRestRemainingMs: 0,
        },
        20_000,
      ),
    ).toBe(10_000)
    expect(
      getSessionRestRemainingMs(
        {
          elapsedMs: 0,
          paused: false,
          runningSince: 0,
          restEndsAt: 30_000,
          pausedRestRemainingMs: 0,
        },
        40_000,
      ),
    ).toBe(0)
  })

  it('validates editable set drafts while accepting empty intermediate input and decimal weights', () => {
    expect(validateSetDraft({ weight: '52,5', reps: '8', rir: 2 })).toMatchObject({
      success: true,
      data: { weight: 52.5, reps: 8, rir: 2 },
    })
    expect(validateSetDraft({ weight: '', reps: '8', rir: 2 })).toMatchObject({
      success: false,
    })
    expect(validateSetDraft({ weight: '52.5', reps: '8.5', rir: 2 })).toMatchObject({
      success: false,
    })
  })

  it('builds session exercises from the saved plan and catalog metadata', () => {
    expect(buildSessionExercises(plan, [benchPress], [])).toMatchObject([
      {
        exercise_id: 'bench-press',
        name: 'Wyciskanie sztangi leżąc',
        targetSets: 3,
        targetReps: '8-10',
        restSeconds: 180,
        note: 'Kontroluj opuszczanie.',
      },
    ])
  })

  it('builds a free-session exercise without a planned rep target', () => {
    expect(buildFreeSessionExercise(benchPress.id, [benchPress], [])).toMatchObject({
      exercise_id: benchPress.id,
      targetSets: 1,
      targetReps: 'Bez celu',
      completedSets: [],
    })
  })

  it('uses profile rest defaults for the exercise rest type', () => {
    const exercises = buildSessionExercises(plan, [benchPress], [], {
      heavy_compound: 240,
      moderate_compound: 150,
      isolation: 75,
    })

    expect(exercises[0]?.restSeconds).toBe(240)
  })

  it('offers only active, non-excluded same-muscle alternatives with their own history', () => {
    const inclinePress = ExerciseSchema.parse({
      ...benchPress,
      id: 'incline-press',
      name: 'Wyciskanie hantli na skosie',
      equipment: 'dumbbell',
      rest_type: 'moderate_compound',
      technique_note: 'Nie blokuj łokci.',
    })
    const excludedPress = ExerciseSchema.parse({
      ...benchPress,
      id: 'excluded-press',
      name: 'Wykluczone ćwiczenie',
    })
    const inactivePress = ExerciseSchema.parse({
      ...benchPress,
      id: 'inactive-press',
      active: false,
    })
    const backRow = ExerciseSchema.parse({
      ...benchPress,
      id: 'back-row',
      name: 'Wiosłowanie',
      category: 'back',
    })
    const inclineHistory = WorkoutSchema.parse({
      id: 'incline-history',
      start_time: '2026-10-15T12:00:00.000Z',
      end_time: '2026-10-15T13:00:00.000Z',
      status: 'completed',
      plan_name: 'Pull',
      exercises: [
        {
          exercise_id: inclinePress.id,
          exercise_name: inclinePress.name,
          sets: [{ set_number: 1, weight_kg: 22.5, reps: 10 }],
        },
      ],
    })

    const [sessionExercise] = buildSessionExercises(
      plan,
      [benchPress, inclinePress, excludedPress, inactivePress, backRow],
      [inclineHistory],
      undefined,
      {
        excluded_exercise_ids: [excludedPress.id],
        favorite_exercise_ids: [],
      },
    )

    expect(sessionExercise?.alternatives).toEqual([
      expect.objectContaining({
        id: inclinePress.id,
        name: inclinePress.name,
        note: inclinePress.technique_note,
        suggested: { weight: 22.5, reps: 10 },
        lastTime: '22.5 kg × 10',
      }),
    ])
  })

  it('moves an interrupted workout to finalization without dropping saved sets', () => {
    const interruptedWorkout = WorkoutSchema.parse({
      id: 'interrupted',
      start_time: '2026-10-16T12:00:00.000Z',
      status: 'in_progress',
      plan_id: plan.id,
      plan_name: plan.name,
      exercises: [
        {
          exercise_id: benchPress.id,
          exercise_name: benchPress.name,
          note_during_workout: 'Nadgarstek bez bólu.',
          sets: [{ set_number: 1, weight_kg: 55, reps: 5, rir: 1 }],
        },
      ],
    })

    expect(
      prepareInterruptedWorkoutForFinalization(interruptedWorkout, '2026-10-16T12:45:00.000Z'),
    ).toMatchObject({
      status: 'pending_finalization',
      end_time: '2026-10-16T12:45:00.000Z',
      exercises: [{ sets: [{ set_number: 1, weight_kg: 55, reps: 5, rir: 1 }] }],
    })
  })

  it('reports an empty exercise catalog instead of creating placeholder session items', () => {
    expect(getWorkoutPlanCatalogError(plan, [])).toContain('Katalog ćwiczeń jest pusty')
    expect(() => buildSessionExercises(plan, [], [])).toThrow('Katalog ćwiczeń jest pusty')
  })

  it('reports missing catalog references and empty saved plans', () => {
    const missingExercisePlan = WorkoutPlanSchema.parse({
      ...plan,
      exercises: [{ ...plan.exercises[0], exercise_id: 'deleted-exercise' }],
    })
    expect(getWorkoutPlanCatalogError(missingExercisePlan, [benchPress])).toContain(
      'nie istnieje w katalogu',
    )
    expect(() => buildSessionExercises(missingExercisePlan, [benchPress], [])).toThrow(
      'nie istnieje w katalogu',
    )

    const emptyPlan = { ...plan, exercises: [] }
    expect(getWorkoutPlanCatalogError(emptyPlan, [benchPress])).toContain('nie zawiera ćwiczeń')
  })

  it('uses the latest historical performance and restores sets from the active session', () => {
    const olderWorkout = WorkoutSchema.parse({
      id: 'older',
      start_time: '2026-10-14T12:00:00.000Z',
      end_time: '2026-10-14T13:00:00.000Z',
      status: 'completed',
      plan_id: plan.id,
      plan_name: plan.name,
      exercises: [
        {
          exercise_id: benchPress.id,
          exercise_name: benchPress.name,
          sets: [{ set_number: 1, weight_kg: 40, reps: 10 }],
        },
      ],
    })
    const latestWorkout = WorkoutSchema.parse({
      id: 'latest',
      start_time: '2026-10-15T12:00:00.000Z',
      end_time: '2026-10-15T13:00:00.000Z',
      status: 'completed',
      plan_id: plan.id,
      plan_name: plan.name,
      exercises: [
        {
          exercise_id: benchPress.id,
          exercise_name: benchPress.name,
          sets: [
            { set_number: 1, weight_kg: 50, reps: 8 },
            { set_number: 2, weight_kg: 52.5, reps: 6 },
          ],
        },
      ],
    })
    const activeWorkout = WorkoutSchema.parse({
      id: 'active',
      start_time: '2026-10-16T12:00:00.000Z',
      status: 'in_progress',
      plan_id: plan.id,
      plan_name: plan.name,
      exercises: [
        {
          exercise_id: benchPress.id,
          exercise_name: benchPress.name,
          note_during_workout: 'Nadgarstek bez bólu.',
          sets: [{ set_number: 1, weight_kg: 55, reps: 5, rir: 1 }],
        },
      ],
    })

    const freshSessionExercise = buildSessionExercises(plan, [benchPress], [olderWorkout, latestWorkout])[0]
    expect(freshSessionExercise?.suggested).toEqual({ weight: 52.5, reps: 6 })
    expect(freshSessionExercise?.lastTime).toBe('50 kg × 8, 52.5 kg × 6')
    expect(freshSessionExercise?.completedSets).toEqual([])

    const resumedSessionExercise = buildSessionExercises(plan, [benchPress], [
      olderWorkout,
      latestWorkout,
      activeWorkout,
    ])[0]
    expect(resumedSessionExercise?.suggested).toEqual({ weight: 55, reps: 5 })
    expect(resumedSessionExercise?.completedSets).toEqual([{ weight: 55, reps: 5, rir: 1 }])
    expect(resumedSessionExercise?.workoutNote).toBe('Nadgarstek bez bólu.')
    expect(resumedSessionExercise?.lastTime).toBe('50 kg × 8, 52.5 kg × 6')
  })
})
