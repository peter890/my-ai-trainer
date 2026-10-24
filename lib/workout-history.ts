import { WorkoutLogSchema, type Workout, type WorkoutLog, type WorkoutType } from './schemas'
import { formatPace, getCardioSummary } from './cardio'

function inferWorkoutType(workout: Workout): WorkoutType {
  if (workout.exercises.some((exercise) => exercise.cardio)) return 'cardio'
  const value = workout.plan_name.toLowerCase()

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
  const cardioSummaries = workout.exercises
    .filter((exercise) => exercise.cardio)
    .map((exercise) => getCardioSummary(exercise.cardio!))
  const cardio = cardioSummaries.length > 0
    ? {
        distance_km: cardioSummaries.reduce((sum, summary) => sum + (summary.distanceKm ?? 0), 0),
        calories_kcal: cardioSummaries.some((summary) => summary.caloriesKcal !== undefined)
          ? cardioSummaries.reduce((sum, summary) => sum + (summary.caloriesKcal ?? 0), 0)
          : undefined,
        average_speed_kmh: cardioSummaries.some((summary) => summary.averageSpeedKmh !== undefined)
          ? cardioSummaries.reduce((sum, summary) => sum + (summary.averageSpeedKmh ?? 0), 0) / cardioSummaries.length
          : undefined,
        max_speed_kmh: cardioSummaries.some((summary) => summary.maxSpeedKmh !== undefined)
          ? Math.max(...cardioSummaries.map((summary) => summary.maxSpeedKmh ?? 0))
          : undefined,
        average_pace_seconds_per_km: cardioSummaries.some((summary) => summary.averagePaceSecondsPerKm !== undefined)
          ? cardioSummaries.reduce((sum, summary) => sum + (summary.averagePaceSecondsPerKm ?? 0), 0) / cardioSummaries.length
          : undefined,
        fastest_pace_seconds_per_km: cardioSummaries.some((summary) => summary.fastestPaceSecondsPerKm !== undefined)
          ? Math.min(...cardioSummaries.map((summary) => summary.fastestPaceSecondsPerKm ?? Number.POSITIVE_INFINITY))
          : undefined,
        elevation_gain_m: cardioSummaries.some((summary) => summary.elevationGainM !== undefined)
          ? cardioSummaries.reduce((sum, summary) => sum + (summary.elevationGainM ?? 0), 0)
          : undefined,
        average_incline_percent: cardioSummaries.some((summary) => summary.averageInclinePercent !== undefined)
          ? cardioSummaries.reduce((sum, summary) => sum + (summary.averageInclinePercent ?? 0), 0) / cardioSummaries.length
          : undefined,
        max_incline_percent: cardioSummaries.some((summary) => summary.maxInclinePercent !== undefined)
          ? Math.max(...cardioSummaries.map((summary) => summary.maxInclinePercent ?? 0))
          : undefined,
      }
    : undefined
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
      sets: exercise.cardio
        ? `${exercise.cardio.duration_minutes} min`
        : exercise.sets.length > 0 ? `${exercise.sets.length} × ${exercise.sets[0].reps}` : '0 × 0',
      best: exercise.cardio
        ? (() => {
            const summary = getCardioSummary(exercise.cardio)
            return [
              summary.distanceKm === undefined ? undefined : `${summary.distanceKm} km`,
              formatPace(summary.averagePaceSecondsPerKm),
            ].filter(Boolean).join(' · ') || '—'
          })()
        : bestSet ? `${bestSet.weight_kg.toFixed(1).replace(/\.0$/, '')} kg × ${bestSet.reps}` : '—',
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
    type: inferWorkoutType(workout),
    duration,
    volume: Math.round(volume),
    cardio,
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
