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

export type EquipmentLabel = 'Sztanga' | 'Hantle' | 'Wyciąg' | 'Maszyna' | 'Kalistenika' | 'Kardio'

const categoryByLabel: Record<MuscleGroup, MuscleCategory> = {
  Klatka: 'chest',
  Plecy: 'back',
  Barki: 'shoulders',
  Nogi: 'legs',
  Ramiona: 'arms',
  Brzuch: 'abs',
}

const labelByCategory: Record<MuscleCategory, MuscleGroup> = {
  chest: 'Klatka',
  back: 'Plecy',
  shoulders: 'Barki',
  legs: 'Nogi',
  arms: 'Ramiona',
  abs: 'Brzuch',
}

const equipmentByLabel: Record<EquipmentLabel, Equipment> = {
  Sztanga: 'barbell',
  Hantle: 'dumbbell',
  Wyciąg: 'cable',
  Maszyna: 'machine',
  Kalistenika: 'calisthenics',
  Kardio: 'cardio',
}

const labelByEquipment: Record<Equipment, EquipmentLabel> = {
  barbell: 'Sztanga',
  dumbbell: 'Hantle',
  cable: 'Wyciąg',
  machine: 'Maszyna',
  calisthenics: 'Kalistenika',
  cardio: 'Kardio',
}

export function toExerciseView(
  exercise: Exercise,
  preferences: ExercisePreferences,
): ExerciseView {
  return {
    id: exercise.id,
    name: exercise.name,
    muscle: labelByCategory[exercise.category],
    equipment: labelByEquipment[exercise.equipment],
    favorite: preferences.favorite_exercise_ids.includes(exercise.id),
    excluded: preferences.excluded_exercise_ids.includes(exercise.id),
    custom: exercise.custom,
  }
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
    await Promise.all(builtInExercises.map((exercise) => exerciseStore.put(exercise)))
  }

  if (!preferences) {
    const defaultPreferences: ExercisePreferencesInput = {
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
