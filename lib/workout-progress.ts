import {
  WorkoutProgressSeriesSchema,
  type WeightEntry,
  type Workout,
  type WorkoutProgressSeries,
} from './schemas'

function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatChartLabel(isoDate: string): string {
  return isoDate.slice(5).replace('-', '.')
}

function estimateEpleyOneRepMax(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30)
}

export function createWorkoutProgressSeries(
  weightHistory: WeightEntry[],
  workouts: Workout[],
): WorkoutProgressSeries {
  const weightsByDate = new Map<string, number>()
  for (const entry of weightHistory) {
    weightsByDate.set(entry.date, Number(entry.weight_kg.toFixed(1)))
  }

  const volumeByDate = new Map<string, number>()
  const strengthByDate = new Map<string, number>()

  for (const workout of workouts) {
    if (workout.status === 'in_progress' || !workout.end_time) continue

    const dateKey = getLocalDateKey(new Date(workout.start_time))
    let sessionVolume = 0
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        sessionVolume += set.weight_kg * set.reps
      }
    }

    volumeByDate.set(dateKey, (volumeByDate.get(dateKey) ?? 0) + sessionVolume)

    let sessionBestOneRepMax = 0
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        if (set.weight_kg <= 0 || set.reps <= 0) continue
        sessionBestOneRepMax = Math.max(sessionBestOneRepMax, estimateEpleyOneRepMax(set.weight_kg, set.reps))
      }
    }

    if (sessionBestOneRepMax > 0) {
      strengthByDate.set(dateKey, Math.max(strengthByDate.get(dateKey) ?? 0, sessionBestOneRepMax))
    }
  }

  const dates = Array.from(new Set([...weightsByDate.keys(), ...volumeByDate.keys()])).sort((a, b) =>
    a.localeCompare(b),
  )

  const weightVolumePoints = dates.map((date) => ({
    date,
    label: formatChartLabel(date),
    weight_kg: weightsByDate.get(date) ?? null,
    volume_kg: volumeByDate.has(date) ? Math.round(volumeByDate.get(date) ?? 0) : null,
  }))

  const strengthProgressPoints = Array.from(strengthByDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, estimatedOneRepMax]) => ({
      date,
      label: formatChartLabel(date),
      estimated_1rm_kg: Number(estimatedOneRepMax.toFixed(1)),
    }))

  return WorkoutProgressSeriesSchema.parse({
    weight_volume_points: weightVolumePoints,
    strength_progress_points: strengthProgressPoints,
  })
}
