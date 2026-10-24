import type { AiProvider, AiProviderAdapter } from './ai-provider'
import { geminiAdapter } from './ai-providers/gemini'
import { openRouterAdapter } from './ai-providers/openrouter'

const adapters: Record<AiProvider, AiProviderAdapter> = {
  gemini: geminiAdapter,
  openrouter: openRouterAdapter,
}

export function getAiProviderAdapter(provider: AiProvider): AiProviderAdapter {
  return adapters[provider]
}