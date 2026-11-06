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
 * Creates a countdown sound: 3 pleasant beeps with pauses (like "beep... beep... beep").
 * Each beep: 500ms sine wave at 880Hz with smooth envelope.
 * Gap between beeps: 500ms silence.
 * Total duration: ~3 seconds.
 */
export function createRestCompletionSound(audioContext: AudioContext): OscillatorNode[] {
  const oscillators: OscillatorNode[] = []
  const frequency = 880        // A5 - pleasant, clear tone
  const beepDuration = 0.50    // 500ms beep
  const gapDuration = 0.50     // 500ms pause between beeps
  const startTime = audioContext.currentTime

  for (let i = 0; i < 3; i++) {
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()

    osc.type = 'sine'
    osc.frequency.value = frequency

    const beepTime = startTime + i * (beepDuration + gapDuration)

    // Smooth envelope: 10ms attack, sustain, exponential decay to end
    gain.gain.setValueAtTime(0, beepTime)
    gain.gain.linearRampToValueAtTime(0.3, beepTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.01, beepTime + beepDuration)

    osc.connect(gain).connect(audioContext.destination)
    osc.start(beepTime)
    osc.stop(beepTime + beepDuration + 0.05)

    oscillators.push(osc)
  }

  return oscillators
}

/**
 * Plays the rest completion sound (3 beeps with pauses).
 * Returns a Promise that resolves when all beeps finish.
 * Handles AudioContext suspension (required on iOS after user interaction).
 */
export async function playRestCompletionSound(audioContext: AudioContext): Promise<void> {
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  const oscillators = createRestCompletionSound(audioContext)
  const lastOsc = oscillators[oscillators.length - 1]

  return new Promise((resolve) => {
    lastOsc.onended = () => resolve()
    // Fallback: 3 * (500ms + 500ms) + buffer = ~3.5s
    setTimeout(resolve, 4000)
  })
}

/**
 * Checks if Web Audio API is supported in the current environment.
 */
export function isWebAudioSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'AudioContext' in window || 'webkitAudioContext' in window
}