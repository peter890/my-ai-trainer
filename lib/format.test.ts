import { describe, expect, it } from 'vitest'
import { formatCurrentDate, formatDuration, formatHistoryDate, formatPolishCount } from './format'

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
    expect(formatHistoryDate('2026-10-15')).toBe('czwartek, 15 października 2026')
    expect(formatHistoryDate('')).toBeNull()
    expect(formatHistoryDate('not-a-date')).toBeNull()
    expect(formatHistoryDate('2026-02-31')).toBeNull()
  })

  describe('formatPolishCount', () => {
    it('uses the correct Polish plural form', () => {
      expect(formatPolishCount(1, 'trening', 'treningi', 'treningów')).toBe('1 trening')
      expect(formatPolishCount(4, 'trening', 'treningi', 'treningów')).toBe('4 treningi')
      expect(formatPolishCount(14, 'trening', 'treningi', 'treningów')).toBe('14 treningów')
      expect(formatPolishCount(22, 'trening', 'treningi', 'treningów')).toBe('22 treningi')
    })
  })
})

describe('formatCurrentDate', () => {
  it('formats the current dashboard date in Polish', () => {
    expect(formatCurrentDate(new Date('2026-10-24T12:00:00.000Z'))).toBe('sobota, 24 października 2026')
  })
})
