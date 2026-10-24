import { z } from 'zod'

export const AiProviderSchema = z.enum(['gemini', 'openrouter'])
export const AI_PROVIDERS = AiProviderSchema.options
export type AiProvider = z.infer<typeof AiProviderSchema>
export const DEFAULT_AI_PROVIDER: AiProvider = 'gemini'

export type AiFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type AiTextRequest = {
  prompt: string
  maxOutputTokens: number
  temperature: number
  responseFormat?: 'json'
}

export class AiProviderRequestError extends Error {
  constructor(
    public readonly provider: AiProvider,
    public readonly status: number,
  ) {
    super(`${provider} request failed with HTTP ${status}`)
    this.name = 'AiProviderRequestError'
  }
}

export type AiProviderAdapter = {
  id: AiProvider
  label: string
  apiKeySchema: z.ZodType<string>
  storageKey: string
  storageEvent: string
  requestText: (request: AiTextRequest, apiKey: string, fetcher: AiFetcher) => Promise<string>
}