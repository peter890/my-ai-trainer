import { describe, expect, it, vi } from 'vitest'
import { getExpiredRestSignalEnd, sendRestCompletionSignal } from './rest-signal'

describe('rest completion signal', () => {
  it('returns an expired rest end once and ignores skipped or repeated timers', () => {
    expect(getExpiredRestSignalEnd(10_000, 9_999, null)).toBeNull()
    expect(getExpiredRestSignalEnd(null, 10_000, null)).toBeNull()
    expect(getExpiredRestSignalEnd(10_000, 10_000, null)).toBe(10_000)
    expect(getExpiredRestSignalEnd(10_000, 12_000, 10_000)).toBeNull()
  })

  it('respects the preference and safely handles missing, unavailable, and throwing vibration APIs', () => {
    const vibrate = vi.fn(() => true)
    expect(sendRestCompletionSignal('none', vibrate)).toBe('disabled')
    expect(vibrate).not.toHaveBeenCalled()
    expect(sendRestCompletionSignal('vibrate', undefined)).toBe('unsupported')
    expect(sendRestCompletionSignal('vibrate', () => true)).toBe('sent')
    expect(sendRestCompletionSignal('vibrate', () => false)).toBe('unavailable')
    expect(sendRestCompletionSignal('vibrate', () => { throw new Error('unavailable') })).toBe('unavailable')
  })
})
