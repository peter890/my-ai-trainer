import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from './database'
import {
  deleteExercise,
  deletePlan,
  deleteWorkout,
  getExercises,
  getExercisePreferences,
  getPlans,
  getProfile,
  getWorkout,
  getWorkouts,
  saveExercise,
  saveExercisePreferences,
  savePlan,
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
  it('persists profile, exercise, plan and workout data and supports empty collections/deletes', async () => {
    const database = await createTestDatabase()
    openDatabases.push(database)

    await saveProfile(profile, database)
    await expect(getProfile(database)).resolves.toMatchObject({
      profile: { gender: 'female', injuries_notes: '' },
    })

    await expect(getExercises(database)).resolves.toEqual([])
    await expect(getExercisePreferences(database)).resolves.toEqual({
      excluded_exercise_ids: [],
      favorite_exercise_ids: [],
    })
    await saveExercise(exercise, database)
    await expect(getExercises(database)).resolves.toMatchObject([
      { id: 'bench-press', technique_note: '', custom: false },
    ])
    await deleteExercise('bench-press', database)
    await expect(getExercises(database)).resolves.toEqual([])
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

    await expect(saveWorkout({ ...workout, id: '', status: 'in_progress', end_time: undefined }, database)).rejects.toThrow()
    await expect(deleteWorkout('', database)).rejects.toThrow()
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

  it('upgrades an existing database by adding exercise preferences', async () => {
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

    expect(upgradedDatabase.version).toBe(2)
    expect(upgradedDatabase.objectStoreNames.contains('exercise_preferences')).toBe(true)
  })
})
