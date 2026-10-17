import type { ProfileDocument } from './schemas'

export type RestTimerSignal = ProfileDocument['settings']['rest_timer_signal']

export type RestSignalResult = 'disabled' | 'unsupported' | 'sent' | 'unavailable'

export function getExpiredRestSignalEnd(
  restEndsAt: number | null,
  now: number,
  lastSignaledEnd: number | null,
): number | null {
  if (restEndsAt === null || now < restEndsAt || restEndsAt === lastSignaledEnd) return null
  return restEndsAt
}

export function sendRestCompletionSignal(
  preference: RestTimerSignal,
  vibrate: (() => boolean) | undefined,
): RestSignalResult {
  if (preference === 'none') return 'disabled'
  if (!vibrate) return 'unsupported'

  try {
    return vibrate() ? 'sent' : 'unavailable'
  } catch {
    return 'unavailable'
  }
}
