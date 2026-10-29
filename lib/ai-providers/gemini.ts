import { z } from 'zod'
import { GEMINI_MODEL } from '../config'
import { AiProviderRequestError, type AiProviderAdapter } from '../ai-provider'

const GeminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional() })).optional(),
        }),
      }),
    )
    .min(1),
})
const GeminiApiKeySchema = z
  .string()
  .trim()
  .min(1, 'Wprowadź klucz API Gemini.')
  .max(512, 'Klucz API Gemini jest nieprawidłowy.')

export const geminiAdapter: AiProviderAdapter = {
  id: 'gemini',
  label: 'Google Gemini',
  apiKeySchema: GeminiApiKeySchema,
  storageKey: 'ai-trainer.gemini-api-key',
  storageEvent: 'ai-trainer:gemini-api-key-changed',
  async requestText(request, apiKey, fetcher) {
    let response: Response
    try {
      response = await fetcher(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            ...(request.systemPrompt
              ? { systemInstruction: { parts: [{ text: request.systemPrompt }] } }
              : {}),
            contents: [{ parts: [{ text: request.prompt }] }],
            generationConfig: {
              maxOutputTokens: request.maxOutputTokens,
              temperature: request.temperature,
              ...(request.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
            },
          }),
        },
      )
    } catch (cause) {
      if (cause instanceof TypeError) throw new AiProviderRequestError('gemini', 0)
      throw cause
    }

    if (!response.ok) throw new AiProviderRequestError('gemini', response.status)

    const result = GeminiResponseSchema.parse(await response.json())
    return result.candidates
      .flatMap((candidate) => (candidate.content.parts ?? []).map((part) => part.text ?? '').filter(Boolean))
      .join('\n')
      .trim()
  },
}