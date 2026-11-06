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

/**
 * Creates a countdown sound: 3 short beeps descending in pitch (like "3, 2, 1").
 * Returns array of OscillatorNodes.
 */
export function createRestCompletionSound(audioContext: AudioContext): OscillatorNode[] {
  const oscillators: OscillatorNode[] = []
  // C6 (1046Hz), A5 (880Hz), F5 (698Hz) - descending musical notes
  const frequencies = [1046, 880, 698]
  const startTime = audioContext.currentTime

  frequencies.forEach((freq, i) => {
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()

    osc.type = 'sine'
    osc.frequency.value = freq

    const beepTime = startTime + i * 0.15 // 150ms apart
    gain.gain.setValueAtTime(0, beepTime)
    gain.gain.linearRampToValueAtTime(0.3, beepTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.01, beepTime + 0.12)

    osc.connect(gain).connect(audioContext.destination)
    osc.start(beepTime)
    osc.stop(beepTime + 0.15)

    oscillators.push(osc)
  })

  return oscillators
}

/**
 * Plays the rest completion sound (countdown: 3 beeps high → mid → low).
 * Returns a Promise that resolves when all beeps finish.
 * Handles AudioContext suspension (required on iOS after user interaction).
 */
export async function playRestCompletionSound(audioContext: AudioContext): Promise<void> {
  // Resume context if suspended (iOS requirement after first user interaction)
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  const oscillators = createRestCompletionSound(audioContext)
  const lastOsc = oscillators[oscillators.length - 1]

  return new Promise((resolve) => {
    lastOsc.onended = () => resolve()
    // Fallback: 3 beeps * 150ms + buffer
    setTimeout(resolve, 600)
  })
}

/**
 * Checks if Web Audio API is supported in the current environment.
 */
export function isWebAudioSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'AudioContext' in window || 'webkitAudioContext' in window
}