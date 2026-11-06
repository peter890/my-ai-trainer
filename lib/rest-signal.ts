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
 * Creates a short, pleasant "beep" sound using Web Audio API.
 * Returns an OscillatorNode that will play the sound when started.
 * The sound is a sine wave at 880Hz (A5) with a quick attack/decay envelope.
 */
export function createRestCompletionSound(audioContext: AudioContext): OscillatorNode {
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = 880 // A5 - clear, audible tone

  // Envelope: quick attack, short sustain, quick decay
  // Attack: 10ms to 0.3 gain, Decay: 250ms to near-silence
  const now = audioContext.currentTime
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.3, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)

  oscillator.connect(gain).connect(audioContext.destination)
  // Stop after 300ms (envelope completes by 250ms)
  oscillator.start(now)
  oscillator.stop(now + 0.3)

  return oscillator
}

/**
 * Plays the rest completion sound.
 * Returns a Promise that resolves when the sound finishes playing.
 * Handles AudioContext suspension (required on iOS after user interaction).
 */
export async function playRestCompletionSound(audioContext: AudioContext): Promise<void> {
  // Resume context if suspended (iOS requirement after first user interaction)
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  const oscillator = createRestCompletionSound(audioContext)

  return new Promise((resolve) => {
    oscillator.onended = () => resolve()
    // Fallback in case onended doesn't fire
    setTimeout(resolve, 350)
  })
}

/**
 * Checks if Web Audio API is supported in the current environment.
 */
export function isWebAudioSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'AudioContext' in window || 'webkitAudioContext' in window
}