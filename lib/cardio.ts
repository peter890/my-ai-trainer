import type { CardioMetrics, CardioSegment } from './schemas'

export type CardioSummary = {
  distanceKm?: number
  averageSpeedKmh?: number
  maxSpeedKmh?: number
  averagePaceSecondsPerKm?: number
  fastestPaceSecondsPerKm?: number
  caloriesKcal?: number
  averageInclinePercent?: number
  maxInclinePercent?: number
  elevationGainM?: number
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function segmentDistance(segment: CardioSegment): number | undefined {
  if (segment.distance_km !== undefined) return segment.distance_km
  if (segment.speed_kmh !== undefined) return (segment.speed_kmh * segment.duration_minutes) / 60
  return undefined
}

function segmentSpeed(segment: CardioSegment): number | undefined {
  if (segment.speed_kmh !== undefined) return segment.speed_kmh
  if (segment.distance_km !== undefined && segment.duration_minutes > 0) {
    return (segment.distance_km * 60) / segment.duration_minutes
  }
  return undefined
}

export function getCardioSummary(cardio: CardioMetrics, bodyWeightKg?: number): CardioSummary {
  const segments = cardio.segments
  const knownDistances = segments.map(segmentDistance).filter((value): value is number => value !== undefined)
  const totalDistance = cardio.distance_km ?? (knownDistances.length === segments.length
    ? knownDistances.reduce((sum, value) => sum + value, 0)
    : undefined)
  const speeds = segments.map(segmentSpeed).filter((value): value is number => value !== undefined)
  const averageSpeedKmh = totalDistance !== undefined && cardio.duration_minutes > 0
    ? (totalDistance * 60) / cardio.duration_minutes
    : undefined
  const maxSpeedKmh = speeds.length > 0 ? Math.max(...speeds) : averageSpeedKmh
  const averagePaceSecondsPerKm = averageSpeedKmh && averageSpeedKmh > 0
    ? 3600 / averageSpeedKmh
    : undefined
  const fastestPaceSecondsPerKm = maxSpeedKmh && maxSpeedKmh > 0
    ? 3600 / maxSpeedKmh
    : undefined
  const inclineValues = segments
    .map((segment) => segment.incline_percent)
    .filter((value): value is number => value !== undefined)
  const averageInclinePercent = cardio.average_incline_percent ?? (inclineValues.length > 0
    ? inclineValues.reduce((sum, value) => sum + value, 0) / inclineValues.length
    : undefined)
  const maxInclinePercent = cardio.max_incline_percent ?? (inclineValues.length > 0 ? Math.max(...inclineValues) : undefined)
  const elevationGainM = cardio.elevation_gain_m ?? (segments.length > 0 && knownDistances.length === segments.length
    ? segments.reduce(
        (sum, segment, index) => sum + knownDistances[index] * 1000 * Math.max(0, segment.incline_percent ?? 0) / 100,
        0,
      )
    : totalDistance !== undefined && averageInclinePercent !== undefined
      ? totalDistance * 1000 * Math.max(0, averageInclinePercent) / 100
      : undefined)

  let caloriesKcal = cardio.calories_kcal
  if (caloriesKcal === undefined && bodyWeightKg && bodyWeightKg > 0 && averageSpeedKmh !== undefined) {
    const speedMetersPerMinute = averageSpeedKmh * 1000 / 60
    const grade = Math.max(0, (averageInclinePercent ?? 0) / 100)
    const oxygenCost = 0.1 * speedMetersPerMinute + 1.8 * speedMetersPerMinute * grade + 3.5
    const met = Math.max(1, oxygenCost / 3.5)
    caloriesKcal = met * 3.5 * bodyWeightKg / 200 * cardio.duration_minutes
  }

  return {
    distanceKm: totalDistance === undefined ? undefined : round(totalDistance, 2),
    averageSpeedKmh: averageSpeedKmh === undefined ? undefined : round(averageSpeedKmh),
    maxSpeedKmh: maxSpeedKmh === undefined ? undefined : round(maxSpeedKmh),
    averagePaceSecondsPerKm: averagePaceSecondsPerKm === undefined ? undefined : round(averagePaceSecondsPerKm),
    fastestPaceSecondsPerKm: fastestPaceSecondsPerKm === undefined ? undefined : round(fastestPaceSecondsPerKm),
    caloriesKcal: caloriesKcal === undefined ? undefined : Math.round(caloriesKcal),
    averageInclinePercent: averageInclinePercent === undefined ? undefined : round(averageInclinePercent),
    maxInclinePercent: maxInclinePercent === undefined ? undefined : round(maxInclinePercent),
    elevationGainM: elevationGainM === undefined ? undefined : Math.round(elevationGainM),
  }
}

export function formatPace(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '—'
  const roundedSeconds = Math.round(seconds)
  const minutes = Math.floor(roundedSeconds / 60)
  const remainingSeconds = roundedSeconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')} min/km`
}