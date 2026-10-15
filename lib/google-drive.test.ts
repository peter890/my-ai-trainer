import { describe, expect, it } from 'vitest'
import {
  GoogleDriveFileSchema,
  GOOGLE_DRIVE_FILE_NAMES,
  clearDriveSyncQueue,
  compareDriveTimestamps,
  createDriveSyncSummary,
  enqueueDriveSync,
  readDriveSyncQueue,
} from './google-drive'

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

  it('queues offline changes and resolves timestamp conflicts deterministically', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size
      },
    } as Storage

    const entry = enqueueDriveSync('profile', { version: '1.0' }, storage)
    expect(readDriveSyncQueue(storage)).toHaveLength(1)
    expect(entry.entity).toBe('profile')
    expect(compareDriveTimestamps('2026-10-15T00:00:00.000Z', '2026-10-16T00:00:00.000Z')).toBe('remote')
    expect(compareDriveTimestamps('2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z')).toBe('equal')

    clearDriveSyncQueue(storage)
    expect(readDriveSyncQueue(storage)).toHaveLength(0)
  })
})
