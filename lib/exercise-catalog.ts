import type { IDBPDatabase } from 'idb'
import {
  ExerciseSchema,
  type Equipment,
  type Exercise,
  type ExercisePreferences,
  type ExercisePreferencesInput,
  type MuscleGroup as MuscleCategory,
  type RestType,
} from './schemas'
import type { Exercise as ExerciseView, MuscleGroup } from './trainer-data'
import { builtInExercises } from './built-in-exercises'
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
  return exercises.filter((exercise) => exercise.active && !(skipExcluded && exercise.excluded))
}

export function getExerciseAlternatives(exercises: ExerciseView[], exerciseId: string): ExerciseView[] {
  const exercise = exercises.find(({ id }) => id === exerciseId)
  if (!exercise) return []

  return exercises.filter(
    (candidate) =>
      candidate.id !== exerciseId &&
      candidate.muscle === exercise.muscle &&
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

export async function initializeExerciseCatalog(database?: Database): Promise<{
  exercises: Exercise[]
  preferences: ExercisePreferences
}> {
  const db = database ?? (await getDatabase())
  const transaction = db.transaction(['exercises', 'exercise_preferences'], 'readwrite')
  const exerciseStore = transaction.objectStore('exercises')
  const preferencesStore = transaction.objectStore('exercise_preferences')
  const [count, preferences] = await Promise.all([
    exerciseStore.count(),
    preferencesStore.get('current'),
  ])

  if (count === 0) {
    const updatedAt = new Date().toISOString()
    await Promise.all(
      builtInExercises.map((exercise) =>
        exerciseStore.put(ExerciseSchema.parse({ ...exercise, updated_at: updatedAt })),
      ),
    )
  }

  if (!preferences) {
    const defaultPreferences: ExercisePreferencesInput = {
      updated_at: new Date().toISOString(),
      excluded_exercise_ids: [],
      favorite_exercise_ids: [],
    }
    preferencesStore.put(defaultPreferences, 'current')
  }

  await transaction.done

  return {
    exercises: ExerciseSchema.array().parse(await db.getAll('exercises')),
    preferences: await getExercisePreferences(db),
  }
}
