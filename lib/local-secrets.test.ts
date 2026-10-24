import { describe, expect, it } from 'vitest'
import { getAiProviderAdapter } from './ai-provider-registry'
import {
  getAiApiKey,
  getAiProvider,
  removeAiApiKey,
  saveAiApiKey,
  saveAiProvider,
} from './local-secrets'

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size
    },
  }
}

describe('local AI API key storage', () => {
  it('stores the trimmed key only under the local key', () => {
    const storage = createStorage()

    expect(saveAiApiKey('gemini', '  local-test-key  ', storage)).toBe('local-test-key')
    expect(storage.getItem(getAiProviderAdapter('gemini').storageKey)).toBe('local-test-key')
    expect(getAiApiKey('gemini', storage)).toBe('local-test-key')
  })

  it('rejects empty keys and removes a stored key', () => {
    const storage = createStorage()
    expect(() => saveAiApiKey('gemini', '   ', storage)).toThrow()

    saveAiApiKey('gemini', 'local-test-key', storage)
    removeAiApiKey('gemini', storage)

    expect(getAiApiKey('gemini', storage)).toBeUndefined()
  })

  it('stores OpenRouter credentials separately from Gemini credentials', () => {
    const storage = createStorage()

    saveAiApiKey('gemini', 'gemini-key', storage)
    saveAiApiKey('openrouter', 'openrouter-key', storage)

    expect(storage.getItem(getAiProviderAdapter('gemini').storageKey)).toBe('gemini-key')
    expect(storage.getItem(getAiProviderAdapter('openrouter').storageKey)).toBe('openrouter-key')
    expect(getAiApiKey('openrouter', storage)).toBe('openrouter-key')
    expect(getAiApiKey('gemini', storage)).toBe('gemini-key')
  })

  it('persists the selected AI provider locally', () => {
    const storage = createStorage()

    expect(getAiProvider(storage)).toBe('gemini')
    expect(saveAiProvider('openrouter', storage)).toBe('openrouter')
    expect(getAiProvider(storage)).toBe('openrouter')
  })
})
