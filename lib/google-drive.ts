import {z} from 'zod'

export const GoogleDriveSyncStatusSchema = z.enum(['idle', 'connecting', 'connected', 'error'])
export type GoogleDriveSyncStatus = z.infer<typeof GoogleDriveSyncStatusSchema>

export const GoogleDriveFileSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    mimeType: z.string().trim().min(1),
    modifiedTime: z.string().datetime().optional(),
  })
  .passthrough()

export type GoogleDriveFile = z.infer<typeof GoogleDriveFileSchema>

export const GOOGLE_DRIVE_FILE_NAMES = {
  profile: 'user_profile.json',
  workouts: 'workouts_history.json',
} as const

const GOOGLE_OAUTH_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const DRIVE_TOKEN_EVENT = 'ai-trainer:drive-token-changed'
const SILENT_AUTH_ERRORS = new Set(['interaction_required', 'login_required', 'consent_required'])

export function getGoogleDriveClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? ''
}

export function hasGoogleDriveClientId(): boolean {
  return getGoogleDriveClientId().length > 0
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
            error_callback?: (error: { error?: string; error_description?: string }) => void
          }) => {
            requestAccessToken: (options?: { prompt?: 'consent' | 'select_account' | 'none' }) => void
          }
        }
      }
    }
  }
}

let accessToken: string | null = null
let scriptPromise: Promise<void> | null = null

function ensureBrowser(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Google Drive jest dostępne tylko w przeglądarce.')
  }
}

export function getGoogleDriveAccessToken(): string | null {
  return accessToken
}

export function isGoogleDriveConnected(): boolean {
  return accessToken !== null && accessToken.length > 0
}

export function refreshGoogleDriveTokenState(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(DRIVE_TOKEN_EVENT))
}

export function subscribeToGoogleDriveToken(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(DRIVE_TOKEN_EVENT, onChange)
  return () => window.removeEventListener(DRIVE_TOKEN_EVENT, onChange)
}

async function ensureGoogleScriptLoaded(): Promise<void> {
  ensureBrowser()

  if (window.google?.accounts?.oauth2) {
    return
  }

  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_OAUTH_SCRIPT_URL}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Nie udało się załadować Google Identity Services.')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_OAUTH_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Nie udało się załadować Google Identity Services.'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export async function connectGoogleDrive(): Promise<string> {
  ensureBrowser()

  const clientId = getGoogleDriveClientId()
  if (!clientId) {
    throw new Error('Brakuje zmiennej NEXT_PUBLIC_GOOGLE_CLIENT_ID. Ustaw client ID Google OAuth.')
  }

  await ensureGoogleScriptLoaded()

  const googleOauth = window.google?.accounts?.oauth2
  if (!googleOauth) {
    throw new Error('Google Identity Services nie jest dostępne w tej przeglądarce.')
  }

  const token = await requestGoogleDriveToken(googleOauth, clientId, 'consent')
  accessToken = token
  refreshGoogleDriveTokenState()
  return token
}

export async function restoreGoogleDriveConnection(): Promise<boolean> {
  ensureBrowser()

  if (accessToken) return true
  const clientId = getGoogleDriveClientId()
  if (!clientId) return false

  await ensureGoogleScriptLoaded()

  const googleOauth = window.google?.accounts?.oauth2
  if (!googleOauth) {
    throw new Error('Google Identity Services nie jest dostępne w tej przeglądarce.')
  }

  try {
    accessToken = await requestGoogleDriveToken(googleOauth, clientId, 'none')
    refreshGoogleDriveTokenState()
    return true
  } catch (cause) {
    if (cause instanceof GoogleDriveAuthError && SILENT_AUTH_ERRORS.has(cause.code)) {
      return false
    }
    throw cause
  }
}

class GoogleDriveAuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message)
    this.name = 'GoogleDriveAuthError'
  }
}

function requestGoogleDriveToken(
  googleOauth: NonNullable<NonNullable<Window['google']>['accounts']>['oauth2'],
  clientId: string,
  prompt: 'consent' | 'none',
): Promise<string> {
  if (!googleOauth) {
    return Promise.reject(new Error('Google Identity Services nie jest dostępne w tej przeglądarce.'))
  }

  return new Promise<string>((resolve, reject) => {
    const tokenClient = googleOauth.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response) => {
        if (response.access_token) {
          resolve(response.access_token)
          return
        }

        const code = response.error ?? 'access_token_missing'
        const message = response.error ?? 'Nie udało się uzyskać tokena dostępu dla Google Drive.'
        reject(new GoogleDriveAuthError(message, code))
      },
      error_callback: (error) => {
        const code = error.error ?? 'oauth_error'
        const message = error.error_description ?? error.error ?? 'Błąd logowania do Google Drive.'
        reject(new GoogleDriveAuthError(message, code))
      },
    })

    tokenClient.requestAccessToken({ prompt })
  })
}

export function disconnectGoogleDrive(): void {
  accessToken = null
  refreshGoogleDriveTokenState()
}

async function fetchDriveResource(path: string, init: RequestInit = {}): Promise<Response> {
  if (!accessToken) {
    throw new Error('Brak aktywnego połączenia z Google Drive.')
  }

  return fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

export async function listGoogleDriveAppDataFiles(): Promise<GoogleDriveFile[]> {
  const response = await fetchDriveResource(
    `/drive/v3/files?spaces=appDataFolder&fields=files(id,name,mimeType,modifiedTime)&q=${encodeURIComponent("trashed = false and 'appDataFolder' in parents")}`,
  )

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(details || 'Nie udało się pobrać listy plików z Google Drive.')
  }

  const payload = await response.json()
  return z.array(GoogleDriveFileSchema).parse(Array.isArray(payload.files) ? payload.files : [])
}

export async function readGoogleDriveJsonFile(fileName: string): Promise<unknown> {
  const files = await listGoogleDriveAppDataFiles()
  const file = files.find((entry) => entry.name === fileName)
  if (!file) {
    return undefined
  }

  const response = await fetchDriveResource(`/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`)
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || `Nie udało się odczytać pliku ${fileName} z Google Drive.`)
  }

  const text = await response.text()
  if (!text.trim()) {
    return undefined
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Plik ${fileName} nie zawiera poprawnego JSON.`)
  }
}

export async function writeGoogleDriveJsonFile(fileName: string, value: unknown): Promise<GoogleDriveFile> {
  if (!accessToken) {
    throw new Error('Brak aktywnego połączenia z Google Drive.')
  }

  const payload = JSON.stringify(value, null, 2)
  const boundary = 'ai-trainer-drive-upload-boundary'
  const metadata = JSON.stringify({ name: fileName, mimeType: 'application/json', parents: ['appDataFolder'] })
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    payload,
    `--${boundary}--`,
    '',
  ].join('\r\n')

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(details || 'Nie udało się zapisać danych w Google Drive.')
  }

  const result = await response.json()
  return GoogleDriveFileSchema.parse({
    id: result.id,
    name: fileName,
    mimeType: 'application/json',
  })
}

export function createDriveSyncSummary(): string {
  if (!hasGoogleDriveClientId()) {
    return 'Google Drive jest niekonfigurowane. Ustaw NEXT_PUBLIC_GOOGLE_CLIENT_ID.'
  }
  if (isGoogleDriveConnected()) {
    return 'Google Drive jest połączone i gotowe do synchronizacji.'
  }
  return 'Google Drive jest gotowe do połączenia. Token jest przechowywany tylko w pamięci.'
}

export const DRIVE_SYNC_QUEUE_STORAGE_KEY = 'ai-trainer.drive-sync.queue'

export const DriveSyncQueueEntrySchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    entity: z.enum(['profile', 'workouts']),
    action: z.enum(['upsert', 'delete']),
    timestamp: z.string().datetime(),
    version: z.number().int().nonnegative().default(1),
    payload: z.unknown().optional(),
  })
  .strict()

export type DriveSyncQueueEntry = z.infer<typeof DriveSyncQueueEntrySchema>

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function readDriveSyncQueue(storage?: Storage): DriveSyncQueueEntry[] {
  const resolvedStorage = resolveStorage(storage)
  if (!resolvedStorage) return []

  const rawValue = resolvedStorage.getItem(DRIVE_SYNC_QUEUE_STORAGE_KEY)
  if (!rawValue) return []

  try {
    const parsed = JSON.parse(rawValue)
    return z.array(DriveSyncQueueEntrySchema).parse(parsed)
  } catch {
    return []
  }
}

export function writeDriveSyncQueue(entries: DriveSyncQueueEntry[], storage?: Storage): void {
  const resolvedStorage = resolveStorage(storage)
  if (!resolvedStorage) return
  resolvedStorage.setItem(DRIVE_SYNC_QUEUE_STORAGE_KEY, JSON.stringify(entries))
}

export function enqueueDriveSync(
  entity: DriveSyncQueueEntry['entity'],
  payload: unknown,
  storage?: Storage,
): DriveSyncQueueEntry {
  const entry: DriveSyncQueueEntry = {
    id: `${entity}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    entity,
    action: 'upsert',
    timestamp: new Date().toISOString(),
    version: 1,
    payload,
  }

  const queuedEntries = readDriveSyncQueue(storage)
  const nextEntries = [...queuedEntries.filter((item) => item.entity !== entity), entry]
  writeDriveSyncQueue(nextEntries, storage)
  return entry
}

export function clearDriveSyncQueue(storage?: Storage): void {
  const resolvedStorage = resolveStorage(storage)
  if (!resolvedStorage) return
  resolvedStorage.removeItem(DRIVE_SYNC_QUEUE_STORAGE_KEY)
}

export function getDriveSyncQueueLength(storage?: Storage): number {
  return readDriveSyncQueue(storage).length
}

export function compareDriveTimestamps(localTimestamp?: string, remoteTimestamp?: string): 'local' | 'remote' | 'equal' | 'missing' {
  if (!localTimestamp && !remoteTimestamp) return 'equal'
  if (!localTimestamp) return 'remote'
  if (!remoteTimestamp) return 'local'

  const localTime = new Date(localTimestamp).getTime()
  const remoteTime = new Date(remoteTimestamp).getTime()
  if (Number.isNaN(localTime) || Number.isNaN(remoteTime)) return 'equal'
  if (localTime > remoteTime) return 'local'
  if (remoteTime > localTime) return 'remote'
  return 'equal'
}

function getUpdatedAt(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined

  const candidate = value as Record<string, unknown>
  if (typeof candidate.updated_at === 'string') return candidate.updated_at
  if (Array.isArray(candidate)) {
    return candidate
        .map((entry) => getUpdatedAt(entry))
        .filter((timestamp): timestamp is string => typeof timestamp === 'string')
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0]
  }

  if ('profile' in candidate && candidate.profile && typeof candidate.profile === 'object') {
    const profile = candidate.profile as Record<string, unknown>
    if (typeof profile.updated_at === 'string') return profile.updated_at
  }

  return undefined
}

export async function syncDriveReplica(localProfile: unknown, localWorkouts: unknown): Promise<{
  status: 'synced' | 'conflict' | 'skipped'
  message: string
}> {
  if (!isGoogleDriveConnected()) {
    return { status: 'skipped', message: 'Google Drive nie jest połączone. Brak synchronizacji.' }
  }

  const queue = readDriveSyncQueue()
  const remoteProfile = await readGoogleDriveJsonFile(GOOGLE_DRIVE_FILE_NAMES.profile).catch(() => undefined)
  const remoteWorkouts = await readGoogleDriveJsonFile(GOOGLE_DRIVE_FILE_NAMES.workouts).catch(() => undefined)

  const profileConflict = compareDriveTimestamps(getUpdatedAt(localProfile), getUpdatedAt(remoteProfile))
  if (profileConflict === 'remote' || (queue.some((entry) => entry.entity === 'profile') && profileConflict !== 'local')) {
    return { status: 'conflict', message: 'Konflikt profilu: dane z Google Drive są nowsze. Rozwiąż konflikt ręcznie.' }
  }

  const workoutsConflict = compareDriveTimestamps(
    Array.isArray(localWorkouts)
      ? (localWorkouts as Array<{ updated_at?: string }>).map((entry) => entry.updated_at).filter(Boolean).sort().at(-1)
      : undefined,
    Array.isArray(remoteWorkouts)
      ? (remoteWorkouts as Array<{ updated_at?: string }>).map((entry) => entry.updated_at).filter(Boolean).sort().at(-1)
      : undefined,
  )

  if (workoutsConflict === 'remote' || (queue.some((entry) => entry.entity === 'workouts') && workoutsConflict !== 'local')) {
    return { status: 'conflict', message: 'Konflikt treningów: dane z Google Drive są nowsze. Rozwiąż konflikt ręcznie.' }
  }

  if (localProfile && (profileConflict === 'local' || queue.some((entry) => entry.entity === 'profile'))) {
    await writeGoogleDriveJsonFile(GOOGLE_DRIVE_FILE_NAMES.profile, localProfile)
  }

  if (localWorkouts && (workoutsConflict === 'local' || queue.some((entry) => entry.entity === 'workouts'))) {
    await writeGoogleDriveJsonFile(GOOGLE_DRIVE_FILE_NAMES.workouts, localWorkouts)
  }

  clearDriveSyncQueue()

  return {
    status: 'synced',
    message: 'Dane zostały zsynchronizowane z Google Drive AppData.',
  }
}
