import { describe, expect, it } from 'vitest'
import { formatDuration, formatHistoryDate } from './format'

describe('formatDuration', () => {
  it('formats durations with and without hours', () => {
    expect(formatDuration(3725)).toBe('01:02:05')
    expect(formatDuration(125, false)).toBe('02:05')
  })

  it('clamps negative durations to zero', () => {
    expect(formatDuration(-10)).toBe('00:00:00')
  })
})

describe('formatHistoryDate', () => {
  it('formats valid dates and safely handles missing or invalid dates', () => {
    expect(formatHistoryDate('2026-10-15')).toBe('czwartek, 15 października')
    expect(formatHistoryDate('')).toBeNull()
    expect(formatHistoryDate('not-a-date')).toBeNull()
    expect(formatHistoryDate('2026-02-31')).toBeNull()
  })
})
