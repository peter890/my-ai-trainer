import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GoogleDriveFileSchema,
  GOOGLE_DRIVE_FILE_NAMES,
  GOOGLE_DRIVE_TOKEN_STORAGE_KEY,
  DRIVE_SYNC_METADATA_STORAGE_KEY,
  clearGoogleDriveAppData,
  clearDriveSyncQueue,
  compareDriveTimestamps,
  connectGoogleDrive,
  createDriveSyncSummary,
  disconnectGoogleDrive,
  enqueueDriveSync,
  readPersistedGoogleDriveToken,
  readDriveSyncMetadata,
  readDriveSyncQueue,
  syncDriveReplica,
  trySilentGoogleDriveConnection,
} from './google-drive'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

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
      JSON.stringify({ access_token: 'nearly-expired-token', expires_at: now + 30_000 }),
    )
    expect(readPersistedGoogleDriveToken(storage, now)).toBeNull()
    expect(storage.getItem(GOOGLE_DRIVE_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('requests only the Drive AppData scope and persists the returned short-lived token', async () => {
    const storage = createMemoryStorage()
    const requestAccessToken = vi.fn()
    const initTokenClient = vi.fn((config: {
      client_id: string
      scope: string
      callback: (response: { access_token: string; expires_in: number }) => void
    }) => {
      requestAccessToken.mockImplementation(() => {
        config.callback({ access_token: 'oauth-token', expires_in: 3600 })
      })
      return { requestAccessToken }
    })
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id')
    vi.stubGlobal('document', {})
    vi.stubGlobal('window', {
      localStorage: storage,
      dispatchEvent: vi.fn(),
      google: { accounts: { oauth2: { initTokenClient } } },
    })

    await expect(connectGoogleDrive()).resolves.toBe('oauth-token')

    expect(initTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'test-client-id',
        scope: 'https://www.googleapis.com/auth/drive.appdata',
      }),
    )
    expect(requestAccessToken).toHaveBeenCalledOnce()
    expect(JSON.parse(storage.getItem(GOOGLE_DRIVE_TOKEN_STORAGE_KEY) ?? '{}')).toMatchObject({
      access_token: 'oauth-token',
    })
    disconnectGoogleDrive()
    expect(storage.getItem(GOOGLE_DRIVE_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('does not persist a token when Google denies the requested permission', async () => {
    const storage = createMemoryStorage()
    const initTokenClient = vi.fn((config: {
      client_id: string
      scope: string
      callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void
    }) => ({
      requestAccessToken: () => config.callback({ error: 'access_denied' }),
    }))
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id')
    vi.stubGlobal('document', {})
    vi.stubGlobal('window', {
      localStorage: storage,
      dispatchEvent: vi.fn(),
      google: { accounts: { oauth2: { initTokenClient } } },
    })

    await expect(connectGoogleDrive()).rejects.toThrow('access_denied')
    expect(storage.getItem(GOOGLE_DRIVE_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('tries silent authorization without opening a consent prompt', async () => {
    const storage = createMemoryStorage()
    const requestAccessToken = vi.fn()
    const initTokenClient = vi.fn((config: {
      callback: (response: { access_token: string; expires_in: number }) => void
    }) => {
      requestAccessToken.mockImplementation((options?: { prompt?: string }) => {
        expect(options).toEqual({ prompt: 'none' })
        config.callback({ access_token: 'silent-token', expires_in: 3600 })
      })
      return { requestAccessToken }
    })
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id')
    vi.stubGlobal('document', {})
    vi.stubGlobal('window', {
      localStorage: storage,
      dispatchEvent: vi.fn(),
      google: { accounts: { oauth2: { initTokenClient } } },
    })

    await expect(trySilentGoogleDriveConnection()).resolves.toBe('silent-token')
    expect(requestAccessToken).toHaveBeenCalledOnce()
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

  it('deletes every file in the Google Drive app data folder', async () => {
    const storage = createMemoryStorage()
    storage.setItem(
      GOOGLE_DRIVE_TOKEN_STORAGE_KEY,
      JSON.stringify({ access_token: 'test-token', expires_at: Date.now() + 3_600_000 }),
    )
    vi.stubGlobal('window', { localStorage: storage, dispatchEvent: vi.fn() })

    const deletedUrls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (init?.method === 'DELETE') {
          deletedUrls.push(url)
          return new Response(null, { status: 204 })
        }
        return new Response(JSON.stringify({
          files: [
            { id: 'profile-old', name: 'user_profile.json', mimeType: 'application/json' },
            { id: 'workouts-current', name: 'workouts_history.json', mimeType: 'application/json' },
          ],
        }), { status: 200 })
      }) as typeof fetch,
    )

    await expect(clearGoogleDriveAppData()).resolves.toBe(2)
    expect(deletedUrls).toEqual([
      'https://www.googleapis.com/drive/v3/files/profile-old',
      'https://www.googleapis.com/drive/v3/files/workouts-current',
    ])
  })

  it('uploads local replicas as versioned files and clears the queue only after both uploads succeed', async () => {
    const storage = createMemoryStorage()
    storage.setItem(
      GOOGLE_DRIVE_TOKEN_STORAGE_KEY,
      JSON.stringify({ access_token: 'test-token', expires_at: Date.now() + 3_600_000 }),
    )
    vi.stubGlobal('window', { localStorage: storage, dispatchEvent: vi.fn() })

    const calls: { url: string; method: string; body: string }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method ?? 'GET'
        calls.push({ url, method, body: String(init?.body ?? '') })

        if (url.includes('/upload/drive/v3/files?uploadType=multipart')) {
          return new Response(JSON.stringify({ id: `created-${calls.length}` }), { status: 200 })
        }
        if (url.includes('/drive/v3/files?')) {
          return new Response(JSON.stringify({ files: [] }), { status: 200 })
        }
        return new Response('Unexpected request', { status: 500 })
      }) as typeof fetch,
    )

    const profile = {
      version: '1.0' as const,
      updated_at: '2026-10-15T12:00:00.000Z',
      profile: {
        gender: 'female' as const,
        age: 28,
        height_cm: 170,
        weight_history: [],
        experience_level: 'beginner' as const,
        primary_goal: 'strength' as const,
        injuries_notes: '',
      },
      exercise_preferences: {
        excluded_exercise_ids: [],
        favorite_exercise_ids: [],
        custom_exercises: [],
      },
      settings: {
        rest_timer_defaults: {
          heavy_compound: 180,
          moderate_compound: 120,
          isolation: 60,
          isometric: 45,
        },
      },
    }

    enqueueDriveSync('profile', profile, storage)
    enqueueDriveSync('workouts', [], storage)
    const result = await syncDriveReplica(profile, [])

    expect(result.status).toBe('synced')
    const uploads = calls.filter((call) => call.method === 'POST')
    expect(uploads).toHaveLength(2)
    expect(uploads.every((call) => call.body.includes('"version": "1.0"') && call.body.includes('"data":'))).toBe(true)
    expect(readDriveSyncQueue(storage)).toHaveLength(0)
  })

  it('skips unchanged replica downloads when remote metadata and local content match', async () => {
    const storage = createMemoryStorage()
    storage.setItem(
      GOOGLE_DRIVE_TOKEN_STORAGE_KEY,
      JSON.stringify({ access_token: 'test-token', expires_at: Date.now() + 3_600_000 }),
    )
    vi.stubGlobal('window', { localStorage: storage, dispatchEvent: vi.fn() })

    const profile = {
      version: '1.0' as const,
      updated_at: '2026-10-15T12:00:00.000Z',
      profile: {
        gender: 'female' as const,
        age: 28,
        height_cm: 170,
        weight_history: [],
        experience_level: 'beginner' as const,
        primary_goal: 'strength' as const,
        injuries_notes: '',
      },
      exercise_preferences: {
        excluded_exercise_ids: [],
        favorite_exercise_ids: [],
        custom_exercises: [],
      },
      settings: {
        rest_timer_defaults: {
          heavy_compound: 180,
          moderate_compound: 120,
          isolation: 60,
          isometric: 45,
        },
        rest_timer_signal: 'vibrate' as const,
      },
    }
    const files = {
      profile: {
        id: 'remote-profile',
        name: GOOGLE_DRIVE_FILE_NAMES.profile,
        mimeType: 'application/json',
        modifiedTime: '2026-10-15T12:00:00.000Z',
      },
      workouts: {
        id: 'remote-workouts',
        name: GOOGLE_DRIVE_FILE_NAMES.workouts,
        mimeType: 'application/json',
        modifiedTime: '2026-10-15T12:01:00.000Z',
      },
    }
    const requests: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        requests.push(url)
        if (url.includes('/drive/v3/files?')) {
          return new Response(JSON.stringify({ files: [files.profile, files.workouts] }), { status: 200 })
        }
        if (url.includes('/files/remote-profile?alt=media')) {
          return new Response(
            JSON.stringify({ version: '1.0', updated_at: profile.updated_at, data: profile }),
            { status: 200 },
          )
        }
        if (url.includes('/files/remote-workouts?alt=media')) {
          return new Response(
            JSON.stringify({ version: '1.0', updated_at: '2026-10-15T12:01:00.000Z', data: [] }),
            { status: 200 },
          )
        }
        return new Response('Unexpected request', { status: 500 })
      }) as typeof fetch,
    )

    await expect(syncDriveReplica(profile, [])).resolves.toMatchObject({ status: 'synced' })
    expect(readDriveSyncMetadata(storage)).toMatchObject({
      profile: { file_id: files.profile.id, modified_time: files.profile.modifiedTime },
      workouts: { file_id: files.workouts.id, modified_time: files.workouts.modifiedTime },
    })
    expect(storage.getItem(DRIVE_SYNC_METADATA_STORAGE_KEY)).not.toBeNull()

    requests.length = 0
    await expect(syncDriveReplica(profile, [])).resolves.toMatchObject({ status: 'synced' })
    expect(requests.filter((url) => url.includes('?alt=media'))).toHaveLength(0)
    expect(requests.filter((url) => url.includes('/drive/v3/files?'))).toHaveLength(1)
  })

  it('keeps queued changes and does not overwrite a newer remote replica', async () => {
    const storage = createMemoryStorage()
    storage.setItem(
      GOOGLE_DRIVE_TOKEN_STORAGE_KEY,
      JSON.stringify({ access_token: 'test-token', expires_at: Date.now() + 3_600_000 }),
    )
    vi.stubGlobal('window', { localStorage: storage, dispatchEvent: vi.fn() })

    const profile = {
      version: '1.0' as const,
      updated_at: '2026-10-15T12:00:00.000Z',
      profile: {
        gender: 'female' as const,
        age: 28,
        height_cm: 170,
        weight_history: [],
        experience_level: 'beginner' as const,
        primary_goal: 'strength' as const,
        injuries_notes: '',
      },
      exercise_preferences: {
        excluded_exercise_ids: [],
        favorite_exercise_ids: [],
        custom_exercises: [],
      },
      settings: {
        rest_timer_defaults: {
          heavy_compound: 180,
          moderate_compound: 120,
          isolation: 60,
          isometric: 45,
        },
      },
    }
    const newerRemoteProfile = { ...profile, updated_at: '2099-10-16T12:00:00.000Z' }
    const queueEntry = enqueueDriveSync('profile', profile, storage)
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        calls.push(url)
        if (url.includes('/drive/v3/files?')) {
          return new Response(
            JSON.stringify({
              files: [
                {
                  id: 'remote-profile',
                  name: GOOGLE_DRIVE_FILE_NAMES.profile,
                  mimeType: 'application/json',
                  modifiedTime: '2099-10-16T12:00:00.000Z',
                },
              ],
            }),
            { status: 200 },
          )
        }
        if (url.includes('/files/remote-profile?alt=media')) {
          return new Response(
            JSON.stringify({ version: '1.0', updated_at: '2099-10-16T12:00:00.000Z', data: newerRemoteProfile }),
            { status: 200 },
          )
        }
        return new Response('Unexpected request', { status: 500 })
      }) as typeof fetch,
    )

    const result = await syncDriveReplica(profile, [])

    expect(result.status).toBe('conflict')
    expect(readDriveSyncQueue(storage)).toMatchObject([{ id: queueEntry.id }])
    expect(calls.some((url) => url.includes('/upload/'))).toBe(false)
  })

  it('updates an existing Drive file instead of creating a duplicate', async () => {
    const storage = createMemoryStorage()
    storage.setItem(
      GOOGLE_DRIVE_TOKEN_STORAGE_KEY,
      JSON.stringify({ access_token: 'test-token', expires_at: Date.now() + 3_600_000 }),
    )
    vi.stubGlobal('window', { localStorage: storage, dispatchEvent: vi.fn() })

    const profile = {
      version: '1.0' as const,
      updated_at: '2026-10-16T12:00:00.000Z',
      profile: {
        gender: 'female' as const,
        age: 28,
        height_cm: 170,
        weight_history: [],
        experience_level: 'beginner' as const,
        primary_goal: 'strength' as const,
        injuries_notes: '',
      },
      exercise_preferences: {
        excluded_exercise_ids: [],
        favorite_exercise_ids: [],
        custom_exercises: [],
      },
      settings: {
        rest_timer_defaults: {
          heavy_compound: 180,
          moderate_compound: 120,
          isolation: 60,
          isometric: 45,
        },
      },
    }
    const remoteProfile = { ...profile, updated_at: '2026-10-15T12:00:00.000Z' }
    enqueueDriveSync('profile', profile, storage)
    const methods: string[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method ?? 'GET'
        methods.push(`${method} ${url}`)
        if (url.includes('/upload/drive/v3/files/existing-profile?uploadType=media')) {
          return new Response(
            JSON.stringify({
              id: 'existing-profile',
              name: GOOGLE_DRIVE_FILE_NAMES.profile,
              mimeType: 'application/json',
            }),
            { status: 200 },
          )
        }
        if (url.includes('/upload/drive/v3/files?uploadType=multipart')) {
          return new Response(JSON.stringify({ id: 'created-workouts' }), { status: 200 })
        }
        if (url.includes('/drive/v3/files?')) {
          return new Response(
            JSON.stringify({
              files: [
                {
                  id: 'existing-profile',
                  name: GOOGLE_DRIVE_FILE_NAMES.profile,
                  mimeType: 'application/json',
                  modifiedTime: '2026-10-15T12:00:00.000Z',
                },
              ],
            }),
            { status: 200 },
          )
        }
        if (url.includes('/files/existing-profile?alt=media')) {
          return new Response(
            JSON.stringify({ version: '1.0', updated_at: '2026-10-15T12:00:00.000Z', data: remoteProfile }),
            { status: 200 },
          )
        }
        return new Response('Unexpected request', { status: 500 })
      }) as typeof fetch,
    )

    const result = await syncDriveReplica(profile, [])

    expect(result.status).toBe('synced')
    expect(methods.some((call) => call.startsWith('PATCH ') && call.includes('existing-profile'))).toBe(true)
    expect(methods.filter((call) => call.startsWith('POST '))).toHaveLength(1)
    expect(readDriveSyncQueue(storage)).toHaveLength(0)
  })

  it('keeps the retry queue when a Drive request fails', async () => {
    const storage = createMemoryStorage()
    storage.setItem(
      GOOGLE_DRIVE_TOKEN_STORAGE_KEY,
      JSON.stringify({ access_token: 'test-token', expires_at: Date.now() + 3_600_000 }),
    )
    vi.stubGlobal('window', { localStorage: storage, dispatchEvent: vi.fn() })
    const queueEntry = enqueueDriveSync('workouts', [], storage)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Drive unavailable', { status: 503 })) as typeof fetch,
    )

    await expect(syncDriveReplica(undefined, [])).rejects.toThrow('Drive unavailable')
    expect(readDriveSyncQueue(storage)).toMatchObject([{ id: queueEntry.id }])
  })
})
