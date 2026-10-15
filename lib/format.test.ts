import { describe, expect, it } from 'vitest'
import { formatDuration } from './format'

describe('formatDuration', () => {
  it('formats durations with and without hours', () => {
    expect(formatDuration(3725)).toBe('01:02:05')
    expect(formatDuration(125, false)).toBe('02:05')
  })

  it('clamps negative durations to zero', () => {
    expect(formatDuration(-10)).toBe('00:00:00')
  })
})
