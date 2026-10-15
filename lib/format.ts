import type { WorkoutType } from './schemas'

export const workoutTypeMeta: Record<WorkoutType, { label: string; dot: string }> = {
  push: { label: 'Push', dot: 'bg-primary' },
  pull: { label: 'Pull', dot: 'bg-chart-2' },
  legs: { label: 'Nogi', dot: 'bg-chart-3' },
  cardio: { label: 'Cardio', dot: 'bg-chart-4' },
}

export function formatDuration(totalSeconds: number, withHours = true) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  const pad = (value: number) => value.toString().padStart(2, '0')
  return withHours
    ? `${pad(hours)}:${pad(minutes)}:${pad(remainder)}`
    : `${pad(minutes)}:${pad(remainder)}`
}

export const numberFormat = new Intl.NumberFormat('pl-PL')
