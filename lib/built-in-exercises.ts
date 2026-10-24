import { ExerciseSchema } from './schemas'
import exerciseConfig from '../data/exercises.json'

export const builtInExercises = ExerciseSchema.array().parse(exerciseConfig)
