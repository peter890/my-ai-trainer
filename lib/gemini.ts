import { z } from 'zod'
import { GEMINI_MODEL } from './config'
import { GeminiApiKeySchema, getGeminiApiKey } from './local-secrets'
import type { ProfileDocument, Workout } from './schemas'

const GeminiTextResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional() })),
        }),
      }),
    )
    .min(1),
})

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function buildGeminiUrl() {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
}

function extractTextFromResponse(payload: unknown): string {
  const result = GeminiTextResponseSchema.parse(payload)
  const textParts = result.candidates.flatMap((candidate) =>
    candidate.content.parts.map((part) => part.text ?? '').filter(Boolean),
  )

  return textParts.join('\n').trim()
}

export async function testGeminiConnection(apiKey: unknown, fetcher: Fetcher = fetch): Promise<void> {
  const validApiKey = GeminiApiKeySchema.parse(apiKey)
  const response = await fetcher(buildGeminiUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': validApiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Odpowiedz jednym słowem: OK.' }] }],
      generationConfig: { maxOutputTokens: 8, temperature: 0 },
    }),
  })

  if (!response.ok) {
    throw new Error(`Test połączenia z Gemini nie powiódł się (HTTP ${response.status}).`)
  }

  const text = extractTextFromResponse(await response.json())
  if (!text) {
    throw new Error('Gemini nie zwróciło tekstowej odpowiedzi testowej.')
  }
}

export async function generateWorkoutAnalysis(
  workout: Workout,
  profile: ProfileDocument | undefined,
  previousWorkouts: Workout[],
  apiKey?: string,
  fetcher: Fetcher = fetch,
): Promise<{ feedback_text: string }> {
  const validApiKey = GeminiApiKeySchema.parse(apiKey ?? getGeminiApiKey())
  const summaryContext = previousWorkouts
    .slice(0, 3)
    .map((item) => {
      const totalVolume = item.exercises.reduce(
        (sum, exercise) =>
          sum +
          exercise.sets.reduce((total, set) => total + Number((set.weight_kg * set.reps).toFixed(2)), 0),
        0,
      )
      return `- ${item.plan_name}: ${item.exercises.reduce((count, exercise) => count + exercise.sets.length, 0)} serii, ${totalVolume} kg objętości.`
    })
    .join('\n')

  const todayExercises = workout.exercises
    .map(
      (exercise) =>
        `- ${exercise.exercise_name}: ${exercise.sets
          .map((set) => `${set.set_number}. ${set.weight_kg} kg × ${set.reps} powt. (RIR ${set.rir ?? 2})`)
          .join('; ') || 'brak serii'}`,
    )
    .join('\n')

  const prompt = `Jesteś doświadczonym trenerem personalnym. Przeanalizuj wykonany trening użytkownika i podaj zwięzły, konkretny feedback oraz zalecenia na kolejny trening. Odpowiadaj krótko, w punktach, maksymalnie 150 słów.

KONTEKST UŻYTKOWNIKA
- Płeć: ${profile?.profile.gender ?? 'nieznana'} | Wiek: ${profile?.profile.age ?? 'nieznany'} | Wzrost: ${profile?.profile.height_cm ?? 'brak'} cm | Waga: ${profile?.profile.weight_history.at(-1)?.weight_kg ?? 'brak'} kg
- Cel: ${profile?.profile.primary_goal ?? 'nieznany'} | Poziom: ${profile?.profile.experience_level ?? 'nieznany'}
- Wykluczone ćwiczenia: ${(profile?.exercise_preferences.excluded_exercise_ids ?? []).join(', ') || 'brak'}

OSTATNIE TRENINGI (HISTORIA 3 SESJI)
${summaryContext || '- brak wcześniejszych treningów'}

DZISIEJSZY TRENING
Nazwa: ${workout.plan_name} | Czas: ${Math.max(1, Math.round((Date.parse(workout.end_time ?? new Date().toISOString()) - Date.parse(workout.start_time)) / 60000))} min
Poziom energii: ${workout.readiness_energy_score ?? 3}/5
Wykonane ćwiczenia i serie:
${todayExercises || '- brak danych o ćwiczeniach'}

UWAGI UŻYTKOWNIKA PO TRENINGU
"${workout.post_workout_user_notes ?? 'Brak dodatkowych uwag.'}"

ZADANIE
1. Oceń progresję i objętość treningową.
2. Odnieś się do notatek dotyczących bólu, kontuzji lub zadyszki (dostosuj ciężary/ćwiczenia na przyszłość).
3. Podaj konkretne wskazówki do wdrożenia na następnym treningu.`

  const response = await fetcher(buildGeminiUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': validApiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 180, temperature: 0.4 },
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini nie odpowiedziało poprawnie (HTTP ${response.status}).`)
  }

  const text = extractTextFromResponse(await response.json())
  if (!text) {
    throw new Error('Gemini nie zwróciło treści analizy treningu.')
  }

  return { feedback_text: text }
}
