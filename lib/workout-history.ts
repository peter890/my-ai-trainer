import { WorkoutLogSchema, type Workout, type WorkoutLog, type WorkoutType } from './schemas'

function inferWorkoutType(planName: string): WorkoutType {
  const value = planName.toLowerCase()

  if (value.includes('pull')) return 'pull'
  if (value.includes('leg') || value.includes('nogi')) return 'legs'
  if (value.includes('cardio')) return 'cardio'

  return 'push'
}

function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function toWorkoutLog(workout: Workout): WorkoutLog {
  const startedAt = new Date(workout.start_time)
  const sets = workout.exercises.flatMap((exercise) => exercise.sets)
  const volume = sets.reduce((sum, set) => sum + set.weight_kg * set.reps, 0)
  const duration = workout.end_time
    ? Math.max(1, Math.round((Date.parse(workout.end_time) - startedAt.getTime()) / 60000))
    : 0
  const exercises = workout.exercises.map((exercise) => {
    const bestSet = exercise.sets.reduce(
      (best, set) => (!best || set.weight_kg * set.reps > best.weight_kg * best.reps ? set : best),
      exercise.sets[0],
    )

    return {
      name: exercise.exercise_name,
      sets: exercise.sets.length > 0 ? `${exercise.sets.length} × ${exercise.sets[0].reps}` : '0 × 0',
      best: bestSet ? `${bestSet.weight_kg.toFixed(1).replace(/\.0$/, '')} kg × ${bestSet.reps}` : '—',
    }
  })

  return WorkoutLogSchema.parse({
    id: workout.id,
    date: getLocalDateKey(startedAt),
    time: new Intl.DateTimeFormat('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(startedAt),
    title: workout.plan_name || 'Trening',
    type: inferWorkoutType(workout.plan_name || 'Push'),
    duration,
    volume: Math.round(volume),
    energy: workout.readiness_energy_score ?? 3,
    notes: workout.post_workout_user_notes || undefined,
    exercises,
    aiFeedback: workout.ai_analysis?.feedback_text
      ? workout.ai_analysis.feedback_text
          .split(/\n|(?<=[.!?])\s+/)
          .map((line) => line.trim())
          .filter(Boolean)
      : ['Brak analizy AI dla tej sesji.'],
  })
}

export function createWorkoutLogs(workouts: Workout[]): WorkoutLog[] {
  return workouts
    .filter((workout) => workout.status !== 'in_progress')
    .sort((left, right) => right.start_time.localeCompare(left.start_time))
    .map(toWorkoutLog)
}

export function groupWorkoutLogsByDate(logs: WorkoutLog[]): Map<string, WorkoutLog[]> {
  const grouped = new Map<string, WorkoutLog[]>()
  for (const log of logs) {
    const dateLogs = grouped.get(log.date)
    if (dateLogs) {
      dateLogs.push(log)
    } else {
      grouped.set(log.date, [log])
    }
  }
  return grouped
}
