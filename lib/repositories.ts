import type { IDBPDatabase } from 'idb'
import {
  ExerciseSchema,
  ExercisePreferencesSchema,
  LiveSessionSnapshotSchema,
  ProfileDocumentSchema,
  WorkoutPlanSchema,
  WorkoutSchema,
  EntityIdSchema,
  type Exercise,
  type ExerciseInput,
  type ExercisePreferences,
  type ExercisePreferencesInput,
  type LiveSessionSnapshot,
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

export const EXERCISE_CATALOG_EVENT = 'ai-trainer:exercise-catalog-changed'

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

export async function saveExercise(exercise: ExerciseInput, database?: Database): Promise<Exercise> {
  const validExercise = ExerciseSchema.parse({ ...exercise, updated_at: new Date().toISOString() })
  const db = await databaseOrDefault(database)
  await db.put('exercises', validExercise)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EXERCISE_CATALOG_EVENT))
  }
  return validExercise
}

export async function getExercises(database?: Database): Promise<Exercise[]> {
  const db = await databaseOrDefault(database)
  return ExerciseSchema.array().parse(await db.getAll('exercises'))
}

export function subscribeToExerciseCatalog(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EXERCISE_CATALOG_EVENT, onChange)
  return () => window.removeEventListener(EXERCISE_CATALOG_EVENT, onChange)
}

export async function getExercisePreferences(database?: Database): Promise<ExercisePreferences> {
  const db = await databaseOrDefault(database)
  const preferences = await db.get('exercise_preferences', 'current')
  return ExercisePreferencesSchema.parse(
    preferences ?? {
      updated_at: new Date().toISOString(),
      excluded_exercise_ids: [],
      favorite_exercise_ids: [],
    },
  )
}

export async function saveExercisePreferences(
  preferences: ExercisePreferencesInput,
  database?: Database,
): Promise<void> {
  const validPreferences = ExercisePreferencesSchema.parse({
    ...preferences,
    updated_at: new Date().toISOString(),
  })
  const db = await databaseOrDefault(database)
  await db.put('exercise_preferences', validPreferences, 'current')
}

export async function deleteExercise(id: string, database?: Database): Promise<void> {
  const validId = EntityIdSchema.parse(id)
  const db = await databaseOrDefault(database)
  const exercise = await db.get('exercises', validId)
  if (!exercise) return

  const [plans, workouts] = await Promise.all([db.getAll('plans'), db.getAll('workouts')])
  const isReferenced =
    plans.some((plan) => plan.exercises.some((item) => item.exercise_id === validId)) ||
    workouts.some((workout) => workout.exercises.some((item) => item.exercise_id === validId))

  if (isReferenced || !exercise.custom) {
    await db.put('exercises', {
      ...exercise,
      active: false,
      updated_at: new Date().toISOString(),
    })
    return
  }

  await db.delete('exercises', validId)
}

export async function savePlan(plan: WorkoutPlanInput, database?: Database): Promise<void> {
  await savePlans([plan], database)
}

export async function savePlans(plans: WorkoutPlanInput[], database?: Database): Promise<void> {
  const validPlans = WorkoutPlanSchema.array().parse(plans)
  const db = await databaseOrDefault(database)
  const transaction = db.transaction('plans', 'readwrite')
  await Promise.all([...validPlans.map((plan) => transaction.store.put(plan)), transaction.done])
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
  const validWorkout = WorkoutSchema.parse({ ...workout, updated_at: new Date().toISOString() })
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

export async function saveLiveSessionSnapshot(
  snapshot: LiveSessionSnapshot,
  database?: Database,
): Promise<void> {
  const validSnapshot = LiveSessionSnapshotSchema.parse(snapshot)
  const db = await databaseOrDefault(database)
  await db.put('live_session', validSnapshot, 'current')
}

export async function getLiveSessionSnapshot(database?: Database): Promise<LiveSessionSnapshot | undefined> {
  const db = await databaseOrDefault(database)
  const snapshot = await db.get('live_session', 'current')
  return snapshot === undefined ? undefined : LiveSessionSnapshotSchema.parse(snapshot)
}

export async function deleteLiveSessionSnapshot(database?: Database): Promise<void> {
  const db = await databaseOrDefault(database)
  await db.delete('live_session', 'current')
}
