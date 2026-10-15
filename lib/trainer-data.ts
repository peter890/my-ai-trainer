import type { WorkoutType } from './schemas'

export type TabId = 'dashboard' | 'history' | 'exercises' | 'profile'

export type { WorkoutType } from './schemas'

export type LoggedSet = { weight: number; reps: number; rir: number }

export type WorkoutLog = {
  date: string
  title: string
  type: WorkoutType
  duration: number
  volume: number
  energy: number
  notes?: string
  exercises: { name: string; sets: string; best: string }[]
  aiFeedback: string[]
}

export type MuscleGroup = 'Klatka' | 'Plecy' | 'Barki' | 'Nogi' | 'Ramiona' | 'Brzuch'

export const muscleGroups: MuscleGroup[] = ['Klatka', 'Plecy', 'Barki', 'Nogi', 'Ramiona', 'Brzuch']

export type Exercise = {
  id: string
  name: string
  muscle: MuscleGroup
  equipment: string
  favorite: boolean
  excluded: boolean
  custom?: boolean
}

export type LiveExercise = {
  id: string
  name: string
  alternatives: string[]
  note: string
  lastTime: string
  targetSets: number
  targetReps: string
  restSeconds: number
  suggested: { weight: number; reps: number }
  completedSets: LoggedSet[]
}
