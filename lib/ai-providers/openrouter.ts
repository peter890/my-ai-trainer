import { z } from 'zod'
import { OPENROUTER_MODEL } from '../config'
import { AiProviderRequestError, type AiProviderAdapter } from '../ai-provider'

const OpenRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
})
const OpenRouterApiKeySchema = z
  .string()
  .trim()
  .min(1, 'Wprowadź klucz API OpenRouter.')
  .max(512, 'Klucz API OpenRouter jest nieprawidłowy.')

export const openRouterAdapter: AiProviderAdapter = {
  id: 'openrouter',
  label: 'OpenRouter',
  apiKeySchema: OpenRouterApiKeySchema,
  storageKey: 'ai-trainer.openrouter-api-key',
  storageEvent: 'ai-trainer:openrouter-api-key-changed',
  async requestText(request, apiKey, fetcher) {
    let response: Response
    try {
      response = await fetcher('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [{ role: 'user', content: request.prompt }],
          max_tokens: request.maxOutputTokens,
          temperature: request.temperature,
          ...(request.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
        }),
      })
    } catch (cause) {
      if (cause instanceof TypeError) throw new AiProviderRequestError('openrouter', 0)
      throw cause
    }

    if (!response.ok) throw new AiProviderRequestError('openrouter', response.status)

    const result = OpenRouterResponseSchema.parse(await response.json())
    return result.choices.map((choice) => choice.message.content ?? '').filter(Boolean).join('\n').trim()
  },
}