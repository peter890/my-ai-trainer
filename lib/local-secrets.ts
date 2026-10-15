import { z } from 'zod'

export const GEMINI_API_KEY_STORAGE_KEY = 'ai-trainer.gemini-api-key'
export const INVALID_GEMINI_API_KEY_SNAPSHOT = '\u0000invalid-gemini-api-key'

const GEMINI_API_KEY_EVENT = 'ai-trainer:gemini-api-key-changed'

export const GeminiApiKeySchema = z
  .string()
  .trim()
  .min(1, 'Wprowadź klucz API Gemini.')
  .max(512, 'Klucz API Gemini jest nieprawidłowy.')

function getStorage(storage?: Storage): Storage {
  if (storage) return storage
  if (typeof window === 'undefined') {
    throw new Error('Lokalne ustawienia są dostępne tylko w przeglądarce.')
  }
  return window.localStorage
}

export function getGeminiApiKey(storage?: Storage): string | undefined {
  const value = getStorage(storage).getItem(GEMINI_API_KEY_STORAGE_KEY)
  return value === null ? undefined : GeminiApiKeySchema.parse(value)
}

export function getGeminiApiKeySnapshot(): string {
  try {
    return getGeminiApiKey() ?? ''
  } catch {
    return INVALID_GEMINI_API_KEY_SNAPSHOT
  }
}

export function subscribeToGeminiApiKey(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === GEMINI_API_KEY_STORAGE_KEY) onChange()
  }
  const handleLocalChange = () => onChange()

  window.addEventListener('storage', handleStorage)
  window.addEventListener(GEMINI_API_KEY_EVENT, handleLocalChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(GEMINI_API_KEY_EVENT, handleLocalChange)
  }
}

export function saveGeminiApiKey(value: unknown, storage?: Storage): string {
  const apiKey = GeminiApiKeySchema.parse(value)
  getStorage(storage).setItem(GEMINI_API_KEY_STORAGE_KEY, apiKey)
  if (!storage && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(GEMINI_API_KEY_EVENT))
  }
  return apiKey
}

export function removeGeminiApiKey(storage?: Storage): void {
  getStorage(storage).removeItem(GEMINI_API_KEY_STORAGE_KEY)
  if (!storage && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(GEMINI_API_KEY_EVENT))
  }
}
