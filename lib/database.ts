import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Exercise, ProfileDocument, Workout, WorkoutPlan } from './schemas'

export const DATABASE_NAME = 'ai-trainer'
export const DATABASE_VERSION = 2

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
}

export function openDatabase(name = DATABASE_NAME): Promise<IDBPDatabase<TrainerDatabase>> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB nie jest dostępne w tym środowisku.')
  }

  return openDB<TrainerDatabase>(name, DATABASE_VERSION, {
    upgrade(database) {
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
