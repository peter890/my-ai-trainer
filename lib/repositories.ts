import type { IDBPDatabase } from 'idb'
import {
  ExerciseSchema,
  ExercisePreferencesSchema,
  ProfileDocumentSchema,
  WorkoutPlanSchema,
  WorkoutSchema,
  EntityIdSchema,
  type Exercise,
  type ExerciseInput,
  type ExercisePreferences,
  type ExercisePreferencesInput,
  type ProfileDocument,
  type ProfileDocumentInput,
  type Workout,
  type WorkoutInput,
  type WorkoutPlan,
  type WorkoutPlanInput,
} from './schemas'
import { getDatabase, type TrainerDatabase } from './database'
import { enqueueDriveSync } from './google-drive'

type Database = IDBPDatabase<TrainerDatabase>

async function databaseOrDefault(database?: Database): Promise<Database> {
  return database ?? getDatabase()
}

export async function saveProfile(profile: ProfileDocumentInput, database?: Database): Promise<void> {
  const validProfile = ProfileDocumentSchema.parse(profile)
  const db = await databaseOrDefault(database)
  await db.put('profile', validProfile, 'current')

  if (typeof window !== 'undefined') {
    enqueueDriveSync('profile', validProfile)
  }
}

export async function getProfile(database?: Database): Promise<ProfileDocument | undefined> {
  const db = await databaseOrDefault(database)
  const profile = await db.get('profile', 'current')
  return profile === undefined ? undefined : ProfileDocumentSchema.parse(profile)
}

export async function saveExercise(exercise: ExerciseInput, database?: Database): Promise<void> {
  const validExercise = ExerciseSchema.parse(exercise)
  const db = await databaseOrDefault(database)
  await db.put('exercises', validExercise)
}

export async function getExercises(database?: Database): Promise<Exercise[]> {
  const db = await databaseOrDefault(database)
  return ExerciseSchema.array().parse(await db.getAll('exercises'))
}

export async function getExercisePreferences(database?: Database): Promise<ExercisePreferences> {
  const db = await databaseOrDefault(database)
  const preferences = await db.get('exercise_preferences', 'current')
  return ExercisePreferencesSchema.parse(
    preferences ?? {
      excluded_exercise_ids: [],
      favorite_exercise_ids: [],
    },
  )
}

export async function saveExercisePreferences(
  preferences: ExercisePreferencesInput,
  database?: Database,
): Promise<void> {
  const validPreferences = ExercisePreferencesSchema.parse(preferences)
  const db = await databaseOrDefault(database)
  await db.put('exercise_preferences', validPreferences, 'current')
}

export async function deleteExercise(id: string, database?: Database): Promise<void> {
  const validId = EntityIdSchema.parse(id)
  const db = await databaseOrDefault(database)
  await db.delete('exercises', validId)
}

export async function savePlan(plan: WorkoutPlanInput, database?: Database): Promise<void> {
  const validPlan = WorkoutPlanSchema.parse(plan)
  const db = await databaseOrDefault(database)
  await db.put('plans', validPlan)
}

export async function getPlans(database?: Database): Promise<WorkoutPlan[]> {
  const db = await databaseOrDefault(database)
  return WorkoutPlanSchema.array().parse(await db.getAll('plans'))
}

export async function deletePlan(id: string, database?: Database): Promise<void> {
  const validId = EntityIdSchema.parse(id)
  const db = await databaseOrDefault(database)
  await db.delete('plans', validId)
}

export async function saveWorkout(workout: WorkoutInput, database?: Database): Promise<void> {
  const validWorkout = WorkoutSchema.parse(workout)
  const db = await databaseOrDefault(database)
  await db.put('workouts', validWorkout)

  if (typeof window !== 'undefined') {
    enqueueDriveSync('workouts', validWorkout)
  }
}

export async function getWorkout(id: string, database?: Database): Promise<Workout | undefined> {
  const validId = EntityIdSchema.parse(id)
  const db = await databaseOrDefault(database)
  const workout = await db.get('workouts', validId)
  return workout === undefined ? undefined : WorkoutSchema.parse(workout)
}

export async function getWorkouts(database?: Database): Promise<Workout[]> {
  const db = await databaseOrDefault(database)
  return WorkoutSchema.array().parse(await db.getAll('workouts'))
}

export async function deleteWorkout(id: string, database?: Database): Promise<void> {
  const validId = EntityIdSchema.parse(id)
  const db = await databaseOrDefault(database)
  await db.delete('workouts', validId)
}
