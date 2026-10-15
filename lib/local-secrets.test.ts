import { describe, expect, it } from 'vitest'
import {
  GEMINI_API_KEY_STORAGE_KEY,
  getGeminiApiKey,
  removeGeminiApiKey,
  saveGeminiApiKey,
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

describe('local Gemini API key storage', () => {
  it('stores the trimmed key only under the local key', () => {
    const storage = createStorage()

    expect(saveGeminiApiKey('  local-test-key  ', storage)).toBe('local-test-key')
    expect(storage.getItem(GEMINI_API_KEY_STORAGE_KEY)).toBe('local-test-key')
    expect(getGeminiApiKey(storage)).toBe('local-test-key')
  })

  it('rejects empty keys and removes a stored key', () => {
    const storage = createStorage()
    expect(() => saveGeminiApiKey('   ', storage)).toThrow()

    saveGeminiApiKey('local-test-key', storage)
    removeGeminiApiKey(storage)

    expect(getGeminiApiKey(storage)).toBeUndefined()
  })
})
