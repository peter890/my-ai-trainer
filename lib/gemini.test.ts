import { describe, expect, it, vi } from 'vitest'
import { GEMINI_MODEL } from './config'
import { generateWorkoutAnalysis, testGeminiConnection } from './gemini'

describe('testGeminiConnection', () => {
  it('sends the API key in a request header and validates the response', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }), {
        status: 200,
      }),
    )

    await expect(testGeminiConnection('api-key', fetcher)).resolves.toBeUndefined()

    const call = (fetcher as any).mock.calls[0] as [string, RequestInit]
    const [url, request] = call
    expect(url).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    )
    expect(new Headers(request.headers as HeadersInit).get('x-goog-api-key')).toBe('api-key')
  })

  it('reports an HTTP error without logging request credentials', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 403 }))

    await expect(testGeminiConnection('api-key', fetcher)).rejects.toThrow('(HTTP 403)')
  })
})

describe('generateWorkoutAnalysis', () => {
  it('builds the training prompt and parses the AI feedback text', async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Objętość jest dobra. Zmniejsz ciężar o 2,5 kg przy wyciskaniu.' }] } }],
        }),
        { status: 200 },
      ),
    )

    const workout = {
      id: 'workout-1',
      start_time: '2026-10-14T18:00:00.000Z',
      end_time: '2026-10-14T19:00:00.000Z',
      status: 'pending_finalization' as const,
      plan_name: 'Push A',
      paused_duration_ms: 0,
      exercises: [
        {
          exercise_id: 'bench-press',
          exercise_name: 'Wyciskanie',
          sets: [{ set_number: 1, weight_kg: 80, reps: 8, rir: 2 }],
          note_during_workout: 'dobrze',
        },
      ],
      readiness_energy_score: 4,
      post_workout_user_notes: 'Ból nadgarstka po wyciskaniu.',
    }

    await expect(generateWorkoutAnalysis(workout, undefined, [], 'api-key', fetcher)).resolves.toMatchObject({
      feedback_text: 'Objętość jest dobra. Zmniejsz ciężar o 2,5 kg przy wyciskaniu.',
    })

    const call = (fetcher as any).mock.calls[0] as [string, RequestInit]
    const [url, request] = call
    expect(url).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    )
    expect(new Headers(request.headers as HeadersInit).get('x-goog-api-key')).toBe('api-key')
  })
})
