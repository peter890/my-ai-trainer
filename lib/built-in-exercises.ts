import { ExerciseSchema } from './schemas'

export const builtInExercises = ExerciseSchema.array().parse([
  { id: 'bench-press', name: 'Wyciskanie sztangi leżąc', category: 'chest', equipment: 'barbell', rest_type: 'heavy_compound' },
  { id: 'incline-dumbbell-press', name: 'Wyciskanie hantli na skosie', category: 'chest', equipment: 'dumbbell', rest_type: 'moderate_compound' },
  { id: 'cable-fly', name: 'Rozpiętki na bramie', category: 'chest', equipment: 'cable', rest_type: 'isolation' },
  { id: 'dip', name: 'Pompki na poręczach', category: 'chest', equipment: 'calisthenics', rest_type: 'moderate_compound' },
  { id: 'pull-up', name: 'Podciąganie nachwytem', category: 'back', equipment: 'calisthenics', rest_type: 'moderate_compound' },
  { id: 'barbell-row', name: 'Wiosłowanie sztangą', category: 'back', equipment: 'barbell', rest_type: 'heavy_compound' },
  { id: 'lat-pulldown', name: 'Ściąganie drążka wąsko', category: 'back', equipment: 'cable', rest_type: 'moderate_compound' },
  { id: 'overhead-press', name: 'Wyciskanie żołnierskie', category: 'shoulders', equipment: 'barbell', rest_type: 'heavy_compound' },
  { id: 'cable-lateral-raise', name: 'Wznosy bokiem na wyciągu', category: 'shoulders', equipment: 'cable', rest_type: 'isolation' },
  { id: 'face-pull', name: 'Face pull', category: 'shoulders', equipment: 'cable', rest_type: 'isolation' },
  { id: 'barbell-squat', name: 'Przysiad ze sztangą', category: 'legs', equipment: 'barbell', rest_type: 'heavy_compound' },
  { id: 'romanian-deadlift', name: 'Martwy ciąg rumuński', category: 'legs', equipment: 'barbell', rest_type: 'heavy_compound' },
  { id: 'leg-press', name: 'Wypychanie na suwnicy', category: 'legs', equipment: 'machine', rest_type: 'moderate_compound' },
  { id: 'bulgarian-split-squat', name: 'Wykroki bułgarskie', category: 'legs', equipment: 'dumbbell', rest_type: 'moderate_compound' },
  { id: 'dumbbell-curl', name: 'Uginanie z hantlami', category: 'arms', equipment: 'dumbbell', rest_type: 'isolation' },
  { id: 'cable-triceps-extension', name: 'Prostowanie ramion na wyciągu', category: 'arms', equipment: 'cable', rest_type: 'isolation' },
  { id: 'plank', name: 'Plank', category: 'abs', equipment: 'calisthenics', rest_type: 'isolation' },
  { id: 'cable-crunch', name: 'Spięcia brzucha na wyciągu', category: 'abs', equipment: 'cable', rest_type: 'isolation' },
])
