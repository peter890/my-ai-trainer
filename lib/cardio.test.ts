import { describe, expect, it } from 'vitest'
import { formatPace, getCardioSummary } from './cardio'

const baseCardio = {
  duration_minutes: 30,
  distance_km: 5,
  segments: [
    { phase: 'warmup' as const, duration_minutes: 5, distance_km: 0.5, incline_percent: 1 },
    { phase: 'main' as const, duration_minutes: 20, distance_km: 4, speed_kmh: 12, incline_percent: 5 },
    { phase: 'cooldown' as const, duration_minutes: 5, distance_km: 0.5, speed_kmh: 6, incline_percent: 0 },
  ],
}

describe('cardio calculations', () => {
  it('derives speed, pace, incline, elevation and calories', () => {
    const summary = getCardioSummary(baseCardio, 80)

    expect(summary.averageSpeedKmh).toBe(10)
    expect(summary.maxSpeedKmh).toBe(12)
    expect(summary.averagePaceSecondsPerKm).toBe(360)
    expect(summary.fastestPaceSecondsPerKm).toBe(300)
    expect(summary.averageInclinePercent).toBe(2)
    expect(summary.maxInclinePercent).toBe(5)
    expect(summary.elevationGainM).toBe(205)
    expect(summary.caloriesKcal).toBeGreaterThan(300)
  })

  it('uses manual calories and formats pace', () => {
    const summary = getCardioSummary({ ...baseCardio, calories_kcal: 420 })

    expect(summary.caloriesKcal).toBe(420)
    expect(formatPace(summary.averagePaceSecondsPerKm)).toBe('6:00 min/km')
    expect(formatPace(undefined)).toBe('—')
  })
})
