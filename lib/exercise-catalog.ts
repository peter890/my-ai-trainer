import type { IDBPDatabase } from 'idb'
import {
  ExerciseSchema,
  ExerciseCatalogManifestSchema,
  type Equipment,
  type Exercise,
  type ExerciseCatalogEntry,
  type ExerciseCatalogManifest,
  type ExercisePreferences,
  type MuscleGroup as MuscleCategory,
  type RestType,
} from './schemas'
import type { Exercise as ExerciseView, MuscleGroup } from './trainer-data'
import { getDatabase, type TrainerDatabase } from './database'
import { getExercisePreferences } from './repositories'

type Database = IDBPDatabase<TrainerDatabase>

export type ExerciseDraft = {
  id: string
  name: string
  muscle: MuscleGroup
  equipment: EquipmentLabel
  rest_type: RestType
}

export type EquipmentLabel = 'Sztanga' | 'Hantle' | 'Wyciąg' | 'Maszyna' | 'Kalistenika' | 'Kardio' | 'Bieżnia'

const CATALOG_META_KEY = 'current' as const

function canonicalizeCatalog(exercises: ExerciseCatalogEntry[]): string {
  return JSON.stringify(
    [...exercises]
      .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        equipment: exercise.equipment,
        rest_type: exercise.rest_type,
        technique_note: exercise.technique_note,
      })),
  )
}

async function calculateCatalogHash(manifest: ExerciseCatalogManifest): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API nie jest dostępne — nie można zweryfikować katalogu ćwiczeń.')
  }
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalizeCatalog(manifest.exercises)),
  )
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `sha256:${hash}`
}

export async function loadExerciseCatalogManifest(): Promise<ExerciseCatalogManifest> {
  const response = await fetch('/exercise-catalog-manifest.json', { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(`Nie udało się pobrać katalogu ćwiczeń (HTTP ${response.status}).`)
  }

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    throw new Error('Manifest katalogu ćwiczeń zawiera niepoprawny JSON.')
  }

  const manifest = ExerciseCatalogManifestSchema.parse(parsed)
  if (await calculateCatalogHash(manifest) !== manifest.hash) {
    throw new Error('Manifest katalogu ćwiczeń jest niespójny z jego hashem.')
  }
  return manifest
}

const categoryByLabel: Record<MuscleGroup, MuscleCategory> = {
  Klatka: 'chest',
  Plecy: 'back',
  Barki: 'shoulders',
  Nogi: 'legs',
  Ramiona: 'arms',
  Brzuch: 'abs',
  Cardio: 'cardio',
}

const labelByCategory: Record<MuscleCategory, MuscleGroup> = {
  chest: 'Klatka',
  back: 'Plecy',
  shoulders: 'Barki',
  legs: 'Nogi',
  arms: 'Ramiona',
  abs: 'Brzuch',
  cardio: 'Cardio',
}

const equipmentByLabel: Record<EquipmentLabel, Equipment> = {
  Sztanga: 'barbell',
  Hantle: 'dumbbell',
  Wyciąg: 'cable',
  Maszyna: 'machine',
  Kalistenika: 'calisthenics',
  Kardio: 'cardio',
  Bieżnia: 'treadmill',
}

const labelByEquipment: Record<Equipment, EquipmentLabel> = {
  barbell: 'Sztanga',
  dumbbell: 'Hantle',
  cable: 'Wyciąg',
  machine: 'Maszyna',
  calisthenics: 'Kalistenika',
  cardio: 'Kardio',
  treadmill: 'Bieżnia',
}

export function toExerciseView(
  exercise: Exercise,
  preferences: ExercisePreferences,
): ExerciseView {
  return {
    id: exercise.id,
    name: exercise.name,
    active: exercise.active,
    archived: exercise.archived,
    muscle: labelByCategory[exercise.category],
    equipment: labelByEquipment[exercise.equipment],
    restType: exercise.rest_type,
    techniqueNote: exercise.technique_note,
    favorite: preferences.favorite_exercise_ids.includes(exercise.id),
    excluded: preferences.excluded_exercise_ids.includes(exercise.id),
    custom: exercise.custom,
  }
}

export function filterExercisesForPlan(exercises: ExerciseView[], skipExcluded: boolean): ExerciseView[] {
  return exercises.filter(
    (exercise) => !exercise.archived && exercise.active && !(skipExcluded && exercise.excluded),
  )
}

export function getExerciseAlternatives(exercises: ExerciseView[], exerciseId: string): ExerciseView[] {
  const exercise = exercises.find(({ id }) => id === exerciseId)
  if (!exercise) return []

  return exercises.filter(
    (candidate) =>
      candidate.id !== exerciseId &&
      candidate.muscle === exercise.muscle &&
      !candidate.archived &&
      candidate.active &&
      !candidate.excluded,
  )
}

export function filterExercisesByEquipment(
  exercises: ExerciseView[],
  equipment: ExerciseView['equipment'] | 'all',
): ExerciseView[] {
  return equipment === 'all'
    ? exercises
    : exercises.filter((exercise) => exercise.equipment === equipment)
}

export function createExerciseRecord(draft: ExerciseDraft): Exercise {
  return ExerciseSchema.parse({
    id: draft.id,
    name: draft.name,
    category: categoryByLabel[draft.muscle],
    equipment: equipmentByLabel[draft.equipment],
    rest_type: draft.rest_type,
    custom: true,
  })
}

export async function initializeExerciseCatalog(
  database?: Database,
  manifest?: ExerciseCatalogManifest,
): Promise<{
  exercises: Exercise[]
  preferences: ExercisePreferences
  catalogUpdated: boolean
}> {
  const db = database ?? (await getDatabase())
  const catalogManifest = manifest ?? (await loadExerciseCatalogManifest())
  const catalogUpdated = await synchronizeBuiltInExercises(db, catalogManifest)
  const [storedExercises, preferences] = await Promise.all([
    db.getAll('exercises'),
    getExercisePreferences(db),
  ])

  return { exercises: ExerciseSchema.array().parse(storedExercises), preferences, catalogUpdated }
}

export async function synchronizeBuiltInExercises(
  database: Database,
  manifestInput: ExerciseCatalogManifest,
): Promise<boolean> {
  const manifest = ExerciseCatalogManifestSchema.parse(manifestInput)
  const transaction = database.transaction(['exercises', 'exercise_catalog_meta'], 'readwrite')
  const exerciseStore = transaction.objectStore('exercises')
  const metaStore = transaction.objectStore('exercise_catalog_meta')
  const [storedExercises, storedMeta] = await Promise.all([
    exerciseStore.getAll(),
    metaStore.get(CATALOG_META_KEY),
  ])

  if (storedMeta?.hash === manifest.hash) {
    await transaction.done
    return false
  }

  const storedById = new Map(
    storedExercises.map((exercise) => [exercise.id, ExerciseSchema.parse(exercise)]),
  )
  const catalogById = new Map(manifest.exercises.map((exercise) => [exercise.id, exercise]))
  const updatedAt = new Date().toISOString()

  await Promise.all([
    ...manifest.exercises.map((entry) => {
      const stored = storedById.get(entry.id)
      return exerciseStore.put(
        ExerciseSchema.parse({
          ...entry,
          active: stored?.active ?? true,
          archived: false,
          technique_note: stored?.technique_note ?? entry.technique_note,
          custom: false,
          updated_at: updatedAt,
        }),
      )
    }),
    ...storedExercises
      .map((exercise) => ExerciseSchema.parse(exercise))
      .filter((exercise) => !exercise.custom && !catalogById.has(exercise.id))
      .map((exercise) =>
        exerciseStore.put(
          ExerciseSchema.parse({
            ...exercise,
            active: false,
            archived: true,
            updated_at: updatedAt,
          }),
        ),
      ),
    metaStore.put({ hash: manifest.hash }, CATALOG_META_KEY),
    transaction.done,
  ])

  return true
}
