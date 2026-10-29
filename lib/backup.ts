import { z } from 'zod'
import type { IDBPDatabase } from 'idb'
import { getDatabase, type TrainerDatabase } from './database'
import {
  ExercisePreferencesSchema,
  ExerciseSchema,
  ProfileDocumentSchema,
  WorkoutPlanSchema,
  WorkoutSchema,
  type Exercise,
  type ExercisePreferences,
  type ProfileDocument,
  type Workout,
  type WorkoutPlan,
} from './schemas'
import { clearDriveSyncQueue, disconnectGoogleDrive, enqueueDriveSync } from './google-drive'
import { removeAllAiApiKeys } from './local-secrets'

const TrainerBackupDataSchema = z
  .object({
    profile: ProfileDocumentSchema.optional(),
    exercises: z.array(ExerciseSchema),
    exercise_preferences: ExercisePreferencesSchema.optional(),
    plans: z.array(WorkoutPlanSchema),
    workouts: z.array(WorkoutSchema),
  })
  .strict()
  .superRefine((data, context) => {
    for (const [name, records] of Object.entries({
      exercises: data.exercises,
      plans: data.plans,
      workouts: data.workouts,
    })) {
      const ids = records.map((record) => record.id)
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: 'custom',
          message: `Identyfikatory w sekcji ${name} nie mogą się powtarzać.`,
          path: [name],
        })
      }
    }
  })

export const TrainerBackupSchema = z
  .object({
    format: z.literal('ai-trainer-backup'),
    version: z.literal('1.0'),
    exported_at: z.iso.datetime(),
    data: TrainerBackupDataSchema,
  })
  .strict()

export type TrainerBackup = z.infer<typeof TrainerBackupSchema>

type BackupData = TrainerBackup['data']

type LocalRecords = {
  profile?: ProfileDocument
  exercises: Exercise[]
  exercise_preferences?: ExercisePreferences
  plans: WorkoutPlan[]
  workouts: Workout[]
}

function newerRecord<T extends { updated_at?: string }>(
  local: T | undefined,
  imported: T | undefined,
  importedAt: string,
): T | undefined {
  if (!local) {
    return imported?.updated_at ? imported : imported ? { ...imported, updated_at: importedAt } : undefined
  }
  if (!imported) return local

  const importedTimestamp = imported.updated_at ?? importedAt
  const localTimestamp = local.updated_at ?? ''
  return Date.parse(importedTimestamp) > Date.parse(localTimestamp)
    ? { ...imported, updated_at: importedTimestamp }
    : local
}

function mergeRecordsById<T extends { id: string; updated_at?: string }>(
  localRecords: T[],
  importedRecords: T[],
  importedAt: string,
): T[] {
  const merged = new Map(localRecords.map((record) => [record.id, record]))
  for (const imported of importedRecords) {
    merged.set(imported.id, newerRecord(merged.get(imported.id), imported, importedAt)!)
  }
  return Array.from(merged.values())
}

function mergeProfile(
  local: ProfileDocument | undefined,
  imported: ProfileDocument | undefined,
  importedAt: string,
): ProfileDocument | undefined {
  if (!local || !imported) return newerRecord(local, imported, importedAt)

  const winner = newerRecord(local, imported, importedAt)!
  const customExercises = mergeRecordsById(
    local.exercise_preferences.custom_exercises,
    imported.exercise_preferences.custom_exercises,
    importedAt,
  )

  return ProfileDocumentSchema.parse({
    ...winner,
    updated_at: Date.parse(local.updated_at) > Date.parse(imported.updated_at) ? local.updated_at : imported.updated_at,
    profile: {
      ...winner.profile,
    },
    exercise_preferences: {
      ...winner.exercise_preferences,
      custom_exercises: customExercises,
    },
  })
}

export function mergeBackupData(local: LocalRecords, backup: TrainerBackup): BackupData {
  const validLocal = TrainerBackupDataSchema.parse(local)
  const validBackup = TrainerBackupSchema.parse(backup)
  const imported = validBackup.data
  const profileWinsFromImport =
    validLocal.profile !== undefined &&
    imported.profile !== undefined &&
    Date.parse(imported.profile.updated_at) > Date.parse(validLocal.profile.updated_at)
  const winningProfile = mergeProfile(validLocal.profile, imported.profile, validBackup.exported_at)
  return TrainerBackupDataSchema.parse({
    profile: winningProfile
      ? {
          ...winningProfile,
          profile: {
            ...winningProfile.profile,
            weight_history: mergeWeightHistory(
              validLocal.profile,
              imported.profile,
              profileWinsFromImport,
            ),
          },
        }
      : undefined,
    exercises: mergeRecordsById(validLocal.exercises, imported.exercises, validBackup.exported_at),
    exercise_preferences: newerRecord(
      validLocal.exercise_preferences,
      imported.exercise_preferences,
      validBackup.exported_at,
    ),
    plans: mergeRecordsById(validLocal.plans, imported.plans, validBackup.exported_at),
    workouts: mergeRecordsById(validLocal.workouts, imported.workouts, validBackup.exported_at),
  })
}

function mergeWeightHistory(
  local: ProfileDocument | undefined,
  imported: ProfileDocument | undefined,
  importedWins: boolean,
): ProfileDocument['profile']['weight_history'] {
  const preferred = importedWins ? imported : local
  const secondary = importedWins ? local : imported
  const merged = new Map(preferred?.profile.weight_history.map((entry) => [entry.date, entry]) ?? [])
  for (const entry of secondary?.profile.weight_history ?? []) {
    if (!merged.has(entry.date)) merged.set(entry.date, entry)
  }
  return Array.from(merged.values()).sort((left, right) => left.date.localeCompare(right.date))
}

export async function createTrainerBackup(databaseOverride?: IDBPDatabase<TrainerDatabase>): Promise<TrainerBackup> {
  const database = databaseOverride ?? (await getDatabase())
  const [profile, exercises, exercisePreferences, plans, workouts] = await Promise.all([
    database.get('profile', 'current'),
    database.getAll('exercises'),
    database.get('exercise_preferences', 'current'),
    database.getAll('plans'),
    database.getAll('workouts'),
  ])

  return TrainerBackupSchema.parse({
    format: 'ai-trainer-backup',
    version: '1.0',
    exported_at: new Date().toISOString(),
    data: {
      profile: profile === undefined ? undefined : ProfileDocumentSchema.parse(profile),
      exercises: ExerciseSchema.array().parse(exercises),
      exercise_preferences:
        exercisePreferences === undefined ? undefined : ExercisePreferencesSchema.parse(exercisePreferences),
      plans: WorkoutPlanSchema.array().parse(plans),
      workouts: WorkoutSchema.array().parse(workouts),
    },
  })
}

export async function importTrainerBackup(
  value: unknown,
  databaseOverride?: IDBPDatabase<TrainerDatabase>,
): Promise<{ syncQueueWarning?: string }> {
  const backup = TrainerBackupSchema.parse(value)
  const database = databaseOverride ?? (await getDatabase())
  const transaction = database.transaction(
    ['profile', 'exercises', 'exercise_preferences', 'plans', 'workouts'],
    'readwrite',
  )
  const [profile, exercises, exercisePreferences, plans, workouts] = await Promise.all([
    transaction.objectStore('profile').get('current'),
    transaction.objectStore('exercises').getAll(),
    transaction.objectStore('exercise_preferences').get('current'),
    transaction.objectStore('plans').getAll(),
    transaction.objectStore('workouts').getAll(),
  ])

  const local: LocalRecords = {
    profile: profile === undefined ? undefined : ProfileDocumentSchema.parse(profile),
    exercises: ExerciseSchema.array().parse(exercises),
    exercise_preferences:
      exercisePreferences === undefined ? undefined : ExercisePreferencesSchema.parse(exercisePreferences),
    plans: WorkoutPlanSchema.array().parse(plans),
    workouts: WorkoutSchema.array().parse(workouts),
  }
  const merged = mergeBackupData(local, backup)

  if (merged.profile) transaction.objectStore('profile').put(merged.profile, 'current')
  if (merged.exercise_preferences) {
    transaction.objectStore('exercise_preferences').put(merged.exercise_preferences, 'current')
  }
  await Promise.all([
    ...merged.exercises.map((exercise) => transaction.objectStore('exercises').put(exercise)),
    ...merged.plans.map((plan) => transaction.objectStore('plans').put(plan)),
    ...merged.workouts.map((workout) => transaction.objectStore('workouts').put(workout)),
  ])
  await transaction.done

  let syncQueueWarning: string | undefined
  if (typeof window !== 'undefined') {
    try {
      if (merged.profile) enqueueDriveSync('profile', merged.profile)
      if (merged.workouts.length > 0) enqueueDriveSync('workouts', merged.workouts)
    } catch (cause) {
      syncQueueWarning =
        cause instanceof Error
          ? `Dane zostały zaimportowane lokalnie, ale nie udało się dodać ich do kolejki Drive: ${cause.message}`
          : 'Dane zostały zaimportowane lokalnie, ale nie udało się dodać ich do kolejki Drive.'
    }
  }

  return { syncQueueWarning }
}

export async function deleteLocalTrainerData(databaseOverride?: IDBPDatabase<TrainerDatabase>): Promise<void> {
  const database = databaseOverride ?? (await getDatabase())
  const transaction = database.transaction(
    ['profile', 'exercises', 'exercise_preferences', 'plans', 'workouts'],
    'readwrite',
  )
  await Promise.all([
    transaction.objectStore('profile').clear(),
    transaction.objectStore('exercises').clear(),
    transaction.objectStore('exercise_preferences').clear(),
    transaction.objectStore('plans').clear(),
    transaction.objectStore('workouts').clear(),
  ])
  await transaction.done

  clearDriveSyncQueue()
  disconnectGoogleDrive()
  removeAllAiApiKeys()
}

export function parseTrainerBackupJson(json: string): TrainerBackup {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Plik kopii zapasowej nie zawiera poprawnego JSON.')
  }

  const fullBackup = TrainerBackupSchema.safeParse(parsed)
  if (fullBackup.success) return fullBackup.data

  const exerciseCatalog = ExerciseSchema.array().safeParse(parsed)
  if (exerciseCatalog.success) {
    return TrainerBackupSchema.parse({
      format: 'ai-trainer-backup',
      version: '1.0',
      exported_at: new Date().toISOString(),
      data: {
        exercises: exerciseCatalog.data,
        plans: [],
        workouts: [],
      },
    })
  }

  throw fullBackup.error
}

export function getBackupDownloadName(exportedAt: string): string {
  const safeTimestamp = exportedAt.replace(/[:.]/g, '-')
  return `ai-trainer-backup-${safeTimestamp}.json`
}
