import { describe, expect, it } from 'vitest'
import {
  GoogleDriveFileSchema,
  GOOGLE_DRIVE_FILE_NAMES,
  GOOGLE_DRIVE_TOKEN_STORAGE_KEY,
  clearDriveSyncQueue,
  compareDriveTimestamps,
  createDriveSyncSummary,
  enqueueDriveSync,
  readPersistedGoogleDriveToken,
  readDriveSyncQueue,
} from './google-drive'

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: (key) => {
      store.delete(key)
    },
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

describe('google drive helpers', () => {
  it('exposes the expected appdata filenames', () => {
    expect(GOOGLE_DRIVE_FILE_NAMES.profile).toBe('user_profile.json')
    expect(GOOGLE_DRIVE_FILE_NAMES.workouts).toBe('workouts_history.json')
  })

  it('validates drive file metadata', () => {
    const value = GoogleDriveFileSchema.parse({
      id: 'abc123',
      name: 'user_profile.json',
      mimeType: 'application/json',
      modifiedTime: '2026-10-15T12:00:00.000Z',
    })

    expect(value.name).toBe('user_profile.json')
    expect(value.mimeType).toBe('application/json')
  })

  it('reports an unconfigured drive client until env var is set', () => {
    expect(createDriveSyncSummary()).toContain('niekonfigurowane')
  })

  it('restores an unexpired token and removes expired tokens from browser storage', () => {
    const storage = createMemoryStorage()
    const now = Date.parse('2026-10-15T12:00:00.000Z')
    storage.setItem(
      GOOGLE_DRIVE_TOKEN_STORAGE_KEY,
      JSON.stringify({ access_token: 'valid-token', expires_at: now + 3_600_000 }),
    )

    expect(readPersistedGoogleDriveToken(storage, now)).toBe('valid-token')

    storage.setItem(
      GOOGLE_DRIVE_TOKEN_STORAGE_KEY,
      JSON.stringify({ access_token: 'expired-token', expires_at: now - 1 }),
    )
    expect(readPersistedGoogleDriveToken(storage, now)).toBeNull()
    expect(storage.getItem(GOOGLE_DRIVE_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('queues offline changes and resolves timestamp conflicts deterministically', () => {
    const storage = createMemoryStorage()

    const entry = enqueueDriveSync('profile', { version: '1.0' }, storage)
    expect(readDriveSyncQueue(storage)).toHaveLength(1)
    expect(entry.entity).toBe('profile')
    expect(compareDriveTimestamps('2026-10-15T00:00:00.000Z', '2026-10-16T00:00:00.000Z')).toBe('remote')
    expect(compareDriveTimestamps('2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z')).toBe('equal')

    clearDriveSyncQueue(storage)
    expect(readDriveSyncQueue(storage)).toHaveLength(0)
  })
})
