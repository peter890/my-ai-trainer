import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Exercise, LiveSessionSnapshot, ProfileDocument, Workout, WorkoutPlan } from './schemas'

export const DATABASE_NAME = 'ai-trainer'
export const DATABASE_VERSION = 5

export interface TrainerDatabase extends DBSchema {
  profile: {
    key: 'current'
    value: ProfileDocument
  }
  exercises: {
    key: string
    value: Exercise
  }
  exercise_preferences: {
    key: 'current'
    value: import('./schemas').ExercisePreferences
  }
  plans: {
    key: string
    value: WorkoutPlan
  }
  workouts: {
    key: string
    value: Workout
  }
  live_session: {
    key: 'current'
    value: LiveSessionSnapshot
  }
}

export function openDatabase(name = DATABASE_NAME): Promise<IDBPDatabase<TrainerDatabase>> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB nie jest dostępne w tym środowisku.')
  }

  return openDB<TrainerDatabase>(name, DATABASE_VERSION, {
    upgrade(database, oldVersion, _newVersion, transaction) {
      if (!database.objectStoreNames.contains('profile')) {
        database.createObjectStore('profile')
      }
      if (!database.objectStoreNames.contains('exercises')) {
        database.createObjectStore('exercises', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('exercise_preferences')) {
        database.createObjectStore('exercise_preferences')
      }
      if (!database.objectStoreNames.contains('plans')) {
        database.createObjectStore('plans', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('workouts')) {
        database.createObjectStore('workouts', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('live_session')) {
        database.createObjectStore('live_session')
      }

      if (oldVersion < 4) {
        const migratedAt = new Date().toISOString()
        const exercisesStore = transaction.objectStore('exercises')
        const workoutsStore = transaction.objectStore('workouts')
        const preferencesStore = transaction.objectStore('exercise_preferences')
        void Promise.all([
          exercisesStore.getAll(),
          workoutsStore.getAll(),
          preferencesStore.get('current'),
        ]).then(async ([exercises, workouts, preferences]) => {
          await Promise.all([
            ...exercises
              .filter((exercise) => oldVersion < 3 && !exercise.updated_at || typeof exercise.active !== 'boolean')
              .map((exercise) =>
                exercisesStore.put({
                  ...exercise,
                  ...(oldVersion < 3 && !exercise.updated_at ? { updated_at: migratedAt } : {}),
                  ...(typeof exercise.active !== 'boolean' ? { active: true } : {}),
                }),
              ),
            ...workouts
              .filter((workout) => oldVersion < 3 && !workout.updated_at)
              .map((workout) => workoutsStore.put({ ...workout, updated_at: migratedAt })),
            ...(oldVersion < 3 && preferences && !preferences.updated_at
              ? [preferencesStore.put({ ...preferences, updated_at: migratedAt }, 'current')]
              : []),
          ])
        })
      }
    },
  })
}

let defaultDatabase: Promise<IDBPDatabase<TrainerDatabase>> | undefined

export function getDatabase(): Promise<IDBPDatabase<TrainerDatabase>> {
  if (!defaultDatabase) {
    defaultDatabase = openDatabase().catch((error: unknown) => {
      defaultDatabase = undefined
      throw error
    })
  }
  return defaultDatabase
}
