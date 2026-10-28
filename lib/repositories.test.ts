import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from './database'
import {
  deleteExercise,
  deleteLiveSessionSnapshot,
  deletePlan,
  deleteWorkout,
  getExercises,
  getExercisePreferences,
  getLiveSessionSnapshot,
  getPlans,
  getProfile,
  getWorkout,
  getWorkouts,
  saveExercise,
  saveExercisePreferences,
  saveLiveSessionSnapshot,
  savePlan,
  savePlans,
  saveProfile,
  saveWorkout,
} from './repositories'

let databaseName = 0

async function createTestDatabase(name = `ai-trainer-test-${databaseName++}`) {
  return openDatabase(name)
}

const profile = {
  version: '1.0' as const,
  updated_at: '2026-10-14T18:30:00.000Z',
  profile: {
    gender: 'female' as const,
    age: 28,
    height_cm: 170,
    weight_history: [],
    experience_level: 'beginner' as const,
    primary_goal: 'strength' as const,
  },
  exercise_preferences: {
    excluded_exercise_ids: [],
    favorite_exercise_ids: [],
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

const workout = {
  id: 'workout-1',
  start_time: '2026-10-14T18:30:00.000Z',
  end_time: '2026-10-14T19:30:00.000Z',
  status: 'pending_finalization' as const,
  plan_name: 'Push A',
  exercises: [],
}

const exercise = {
  id: 'bench-press',
  name: 'Wyciskanie sztangi leżąc',
  category: 'chest' as const,
  equipment: 'barbell' as const,
  rest_type: 'heavy_compound' as const,
}

const plan = {
  id: 'push-a',
  name: 'Push A',
  type: 'push' as const,
  exercises: [
    {
      exercise_id: 'bench-press',
      order: 0,
      target_sets: 3,
      target_reps: '8-10',
      rest_type: 'heavy_compound' as const,
    },
  ],
  created_at: '2026-10-14T18:30:00.000Z',
  updated_at: '2026-10-14T18:30:00.000Z',
}

const openDatabases: Awaited<ReturnType<typeof createTestDatabase>>[] = []

afterEach(() => {
  for (const database of openDatabases.splice(0)) {
    database.close()
  }
})

describe('IndexedDB repositories', () => {
  it('validates and persists profile edits and weight history', async () => {
    const database = await createTestDatabase()
    openDatabases.push(database)

    await expect(
      saveProfile(
        {
          ...profile,
          profile: { ...profile.profile, age: 12 },
        },
        database,
      ),
    ).rejects.toThrow()
    await expect(getProfile(database)).resolves.toBeUndefined()

    const updatedProfile = {
      ...profile,
      updated_at: '2026-10-16T12:00:00.000Z',
      profile: {
        ...profile.profile,
        age: 31,
        experience_level: 'advanced' as const,
        primary_goal: 'endurance' as const,
        injuries_notes: 'Ograniczyć obciążenie prawego kolana.',
        weight_history: [{ date: '2026-10-16', weight_kg: 80.5 }],
      },
    }
    await saveProfile(updatedProfile, database)
    await expect(getProfile(database)).resolves.toMatchObject({
      profile: {
        age: 31,
        experience_level: 'advanced',
        primary_goal: 'endurance',
        injuries_notes: 'Ograniczyć obciążenie prawego kolana.',
        weight_history: [{ date: '2026-10-16', weight_kg: 80.5 }],
      },
    })

    await expect(
      saveProfile(
        {
          ...updatedProfile,
          profile: {
            ...updatedProfile.profile,
            weight_history: [{ date: '2026-10-16', weight_kg: -1 }],
          },
        },
        database,
      ),
    ).rejects.toThrow()
  })

  it('persists profile, exercise, plan and workout data and supports empty collections/deletes', async () => {
    const database = await createTestDatabase()
    openDatabases.push(database)

    await saveProfile(profile, database)
    await expect(getProfile(database)).resolves.toMatchObject({
      profile: { gender: 'female', injuries_notes: '' },
    })

    await expect(getExercises(database)).resolves.toEqual([])
    await expect(getExercisePreferences(database)).resolves.toMatchObject({
      excluded_exercise_ids: [],
      favorite_exercise_ids: [],
      updated_at: expect.any(String),
    })
    await saveExercise(exercise, database)
    await expect(getExercises(database)).resolves.toMatchObject([
      { id: 'bench-press', active: true, technique_note: '', custom: false },
    ])
    await saveExercise({ ...exercise, active: false }, database)
    await expect(getExercises(database)).resolves.toMatchObject([{ id: 'bench-press', active: false }])
    await saveExercise(
      { ...exercise, active: false, technique_note: 'Zatrzymaj ruch przed przeprostem.' },
      database,
    )
    await expect(getExercises(database)).resolves.toMatchObject([
      { id: 'bench-press', technique_note: 'Zatrzymaj ruch przed przeprostem.' },
    ])
    await deleteExercise('bench-press', database)
    await expect(getExercises(database)).resolves.toMatchObject([{ id: 'bench-press', active: false }])
    const customExercise = {
      ...exercise,
      id: 'custom-row',
      name: 'Własne ćwiczenie',
      custom: true,
    }
    await saveExercise(customExercise, database)
    await deleteExercise('custom-row', database)
    await expect(getExercises(database)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'custom-row' })]),
    )
    await saveExercisePreferences(
      { excluded_exercise_ids: ['bench-press'], favorite_exercise_ids: [] },
      database,
    )
    await expect(getExercisePreferences(database)).resolves.toMatchObject({
      excluded_exercise_ids: ['bench-press'],
    })

    await expect(getPlans(database)).resolves.toEqual([])
    await savePlan(plan, database)
    await expect(getPlans(database)).resolves.toMatchObject([{ id: 'push-a' }])
    await saveExercise({ ...exercise, id: 'referenced-custom', custom: true }, database)
    await savePlan({
      ...plan,
      id: 'custom-plan',
      exercises: [{ ...plan.exercises[0], exercise_id: 'referenced-custom' }],
    }, database)
    await deleteExercise('referenced-custom', database)
    await expect(getExercises(database)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'referenced-custom', active: false })]),
    )
    await savePlan(
      {
        ...plan,
        name: 'Push A edited',
        exercises: [{ ...plan.exercises[0], target_sets: 4, target_reps: '6-8' }],
      },
      database,
    )
    await expect(getPlans(database)).resolves.toMatchObject([
      {
        id: 'push-a',
        name: 'Push A edited',
        exercises: [{ target_sets: 4, target_reps: '6-8' }],
      },
    ])
    await deletePlan('push-a', database)
    await expect(getPlans(database)).resolves.toEqual([])

    await saveWorkout(workout, database)
    await saveWorkout({ ...workout, id: 'workout-2' }, database)
    await expect(getWorkouts(database)).resolves.toHaveLength(2)
    await expect(getWorkout('workout-1', database)).resolves.toMatchObject({
      id: 'workout-1',
      paused_duration_ms: 0,
    })
    await deleteWorkout('workout-1', database)
    await expect(getWorkouts(database)).resolves.toHaveLength(1)

    const liveSnapshot = {
      workout_id: 'live-workout-1',
      plan_id: 'push-a',
      exercise_ids: ['bench-press'],
      exercise_index: 0,
      draft: { weight: '', reps: '8', rir: 2 },
      paused: true,
      elapsed_ms: 120_000,
      rest_remaining_ms: 30_000,
      rest_total_ms: 90_000,
      updated_at: '2026-10-16T12:00:00.000Z',
    }
    await saveLiveSessionSnapshot(liveSnapshot, database)
    await expect(getLiveSessionSnapshot(database)).resolves.toEqual(liveSnapshot)
    await expect(
      saveLiveSessionSnapshot({ ...liveSnapshot, exercise_index: 1 }, database),
    ).rejects.toThrow()
    await deleteLiveSessionSnapshot(database)
    await expect(getLiveSessionSnapshot(database)).resolves.toBeUndefined()

    await expect(saveWorkout({ ...workout, id: '', status: 'in_progress', end_time: undefined }, database)).rejects.toThrow()
    await expect(deleteWorkout('', database)).rejects.toThrow()
  })

  it('validates a generated plan batch before atomically storing it', async () => {
    const database = await createTestDatabase()
    openDatabases.push(database)

    await expect(savePlans([plan, { ...plan, id: '' }], database)).rejects.toThrow()
    await expect(getPlans(database)).resolves.toEqual([])

    await savePlans([{ ...plan, id: 'push-a' }, { ...plan, id: 'pull-a', type: 'pull' }], database)
    await expect(getPlans(database)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'push-a', type: 'push' }),
        expect.objectContaining({ id: 'pull-a', type: 'pull' }),
      ]),
    )
  })

  it('validates data read from IndexedDB instead of returning corrupted records', async () => {
    const database = await createTestDatabase()
    openDatabases.push(database)
    const rawDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(database.name)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = rawDatabase.transaction('profile', 'readwrite')
    transaction.objectStore('profile').put({ ...profile, unexpected: true }, 'current')
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    rawDatabase.close()

    await expect(getProfile(database)).rejects.toThrow()
  })

  it('keeps records available after closing and reopening the database', async () => {
    const database = await createTestDatabase()
    const name = database.name
    await saveProfile(profile, database)
    database.close()

    const reopenedDatabase = await createTestDatabase(name)
    openDatabases.push(reopenedDatabase)

    await expect(getProfile(reopenedDatabase)).resolves.toMatchObject({
      profile: { age: 28 },
    })
  })

  it('upgrades an existing database with preferences and local live-session storage', async () => {
    const name = `ai-trainer-v1-test-${databaseName++}`
    const oldDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1)
      request.onupgradeneeded = () => {
        const database = request.result
        database.createObjectStore('profile')
        database.createObjectStore('exercises', { keyPath: 'id' })
        database.createObjectStore('plans', { keyPath: 'id' })
        database.createObjectStore('workouts', { keyPath: 'id' })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    oldDatabase.close()

    const upgradedDatabase = await openDatabase(name)
    openDatabases.push(upgradedDatabase)

    expect(upgradedDatabase.version).toBe(5)
    expect(upgradedDatabase.objectStoreNames.contains('exercise_preferences')).toBe(true)
    expect(upgradedDatabase.objectStoreNames.contains('live_session')).toBe(true)
  })

  it('adds updated_at timestamps to existing records during the version 3 migration', async () => {
    const name = `ai-trainer-v2-migration-test-${databaseName++}`
    const oldDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 2)
      request.onupgradeneeded = () => {
        const database = request.result
        database.createObjectStore('profile')
        database.createObjectStore('exercises', { keyPath: 'id' })
        database.createObjectStore('exercise_preferences')
        database.createObjectStore('plans', { keyPath: 'id' })
        database.createObjectStore('workouts', { keyPath: 'id' })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = oldDatabase.transaction(
      ['exercises', 'exercise_preferences', 'workouts'],
      'readwrite',
    )
    transaction.objectStore('exercises').put({
      id: 'legacy-exercise',
      name: 'Legacy exercise',
      category: 'chest',
      equipment: 'barbell',
      rest_type: 'heavy_compound',
      technique_note: '',
      custom: false,
    })
    transaction.objectStore('exercise_preferences').put(
      { excluded_exercise_ids: [], favorite_exercise_ids: [] },
      'current',
    )
    transaction.objectStore('workouts').put({
      id: 'legacy-workout',
      start_time: '2026-10-14T18:30:00.000Z',
      status: 'in_progress',
      plan_name: 'Legacy plan',
      exercises: [],
    })
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    oldDatabase.close()

    const upgradedDatabase = await openDatabase(name)
    openDatabases.push(upgradedDatabase)
    const [exercise, preferences, workout] = await Promise.all([
      upgradedDatabase.get('exercises', 'legacy-exercise'),
      upgradedDatabase.get('exercise_preferences', 'current'),
      upgradedDatabase.get('workouts', 'legacy-workout'),
    ])

    expect(exercise?.updated_at).toEqual(expect.any(String))
    expect(preferences?.updated_at).toEqual(expect.any(String))
    expect(workout?.updated_at).toEqual(expect.any(String))
  })

  it('defaults existing exercises to active during the version 4 migration', async () => {
    const name = `ai-trainer-v3-activity-migration-test-${databaseName++}`
    const oldDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 3)
      request.onupgradeneeded = () => {
        const database = request.result
        database.createObjectStore('profile')
        database.createObjectStore('exercises', { keyPath: 'id' })
        database.createObjectStore('exercise_preferences')
        database.createObjectStore('plans', { keyPath: 'id' })
        database.createObjectStore('workouts', { keyPath: 'id' })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = oldDatabase.transaction('exercises', 'readwrite')
    const legacyExercise = {
      id: 'legacy-active',
      updated_at: '2026-10-14T18:30:00.000Z',
      name: 'Legacy active',
      category: 'chest',
      equipment: 'barbell',
      rest_type: 'heavy_compound',
      technique_note: '',
      custom: false,
    }
    transaction.objectStore('exercises').put(legacyExercise)
    transaction.objectStore('exercises').put({ ...legacyExercise, id: 'legacy-inactive', active: false })
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    oldDatabase.close()

    const upgradedDatabase = await openDatabase(name)
    openDatabases.push(upgradedDatabase)
    const [active, inactive] = await Promise.all([
      upgradedDatabase.get('exercises', 'legacy-active'),
      upgradedDatabase.get('exercises', 'legacy-inactive'),
    ])

    expect(active?.active).toBe(true)
    expect(inactive?.active).toBe(false)
  })
})
