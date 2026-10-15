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

export function formatHistoryDate(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  const parsed = new Date(`${date}T12:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null

  return new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(parsed)
}
