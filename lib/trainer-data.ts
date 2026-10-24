import type { RestType, WorkoutLog, WorkoutType } from './schemas'

export type TabId = 'dashboard' | 'history' | 'exercises' | 'profile'

export type { WorkoutLog, WorkoutType } from './schemas'

export type LoggedSet = { weight: number; reps: number; rir: number }

export type MuscleGroup = 'Klatka' | 'Plecy' | 'Barki' | 'Nogi' | 'Ramiona' | 'Brzuch' | 'Cardio'

export const muscleGroups: MuscleGroup[] = ['Klatka', 'Plecy', 'Barki', 'Nogi', 'Ramiona', 'Brzuch', 'Cardio']

export type Exercise = {
  id: string
  name: string
  active: boolean
  muscle: MuscleGroup
  equipment: string
  restType: RestType
  techniqueNote: string
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
