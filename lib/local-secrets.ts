import { AI_PROVIDERS, AiProviderSchema, DEFAULT_AI_PROVIDER, type AiProvider } from './ai-provider'
import { getAiProviderAdapter } from './ai-provider-registry'

export { AiProviderSchema, DEFAULT_AI_PROVIDER }
export type { AiProvider }
export const AI_PROVIDER_STORAGE_KEY = 'ai-trainer.ai-provider'
export const INVALID_AI_API_KEY_SNAPSHOT = '\u0000invalid-ai-api-key'

const AI_PROVIDER_EVENT = 'ai-trainer:ai-provider-changed'

function getStorage(storage?: Storage): Storage {
  if (storage) return storage
  if (typeof window === 'undefined') {
    throw new Error('Lokalne ustawienia są dostępne tylko w przeglądarce.')
  }
  return window.localStorage
}

function getProviderSecrets(provider: AiProvider) {
  const adapter = getAiProviderAdapter(provider)
  return {
    storageKey: adapter.storageKey,
    storageEvent: adapter.storageEvent,
    apiKeySchema: adapter.apiKeySchema,
  }
}

export function getAiProvider(storage?: Storage): AiProvider {
  const value = getStorage(storage).getItem(AI_PROVIDER_STORAGE_KEY)
  return value === null ? DEFAULT_AI_PROVIDER : AiProviderSchema.parse(value)
}

export function getAiProviderSnapshot(): AiProvider {
  try {
    return getAiProvider()
  } catch {
    return DEFAULT_AI_PROVIDER
  }
}

export function subscribeToAiProvider(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === AI_PROVIDER_STORAGE_KEY) onChange()
  }
  const handleLocalChange = () => onChange()

  window.addEventListener('storage', handleStorage)
  window.addEventListener(AI_PROVIDER_EVENT, handleLocalChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(AI_PROVIDER_EVENT, handleLocalChange)
  }
}

export function saveAiProvider(value: unknown, storage?: Storage): AiProvider {
  const provider = AiProviderSchema.parse(value)
  getStorage(storage).setItem(AI_PROVIDER_STORAGE_KEY, provider)
  if (!storage && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AI_PROVIDER_EVENT))
  }
  return provider
}

export function getAiApiKey(provider: AiProvider, storage?: Storage): string | undefined {
  const { storageKey } = getProviderSecrets(provider)
  const value = getStorage(storage).getItem(storageKey)
  return value === null ? undefined : parseAiApiKey(provider, value)
}

export function parseAiApiKey(provider: AiProvider, value: unknown): string {
  return getProviderSecrets(provider).apiKeySchema.parse(value)
}

export function getAiApiKeySnapshot(provider: AiProvider): string {
  try {
    return getAiApiKey(provider) ?? ''
  } catch {
    return INVALID_AI_API_KEY_SNAPSHOT
  }
}

export function subscribeToAiApiKey(provider: AiProvider, onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const { storageKey, storageEvent: eventName } = getProviderSecrets(provider)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === storageKey) onChange()
  }
  const handleLocalChange = () => onChange()

  window.addEventListener('storage', handleStorage)
  window.addEventListener(eventName, handleLocalChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(eventName, handleLocalChange)
  }
}

export function saveAiApiKey(provider: AiProvider, value: unknown, storage?: Storage): string {
  const { storageKey, storageEvent } = getProviderSecrets(provider)
  const apiKey = parseAiApiKey(provider, value)
  getStorage(storage).setItem(storageKey, apiKey)
  if (!storage && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(storageEvent))
  }
  return apiKey
}

export function removeAiApiKey(provider: AiProvider, storage?: Storage): void {
  const { storageKey, storageEvent } = getProviderSecrets(provider)
  getStorage(storage).removeItem(storageKey)
  if (!storage && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(storageEvent))
  }
}

export function removeAllAiApiKeys(storage?: Storage): void {
  for (const provider of AI_PROVIDERS) removeAiApiKey(provider, storage)
}
