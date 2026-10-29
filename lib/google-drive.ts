import {z} from 'zod'
import { ProfileDocumentSchema, WorkoutSchema, type ProfileDocument, type Workout } from './schemas'

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

const DriveReplicaProfileSchema = z
  .object({
    version: z.literal('1.0'),
    updated_at: z.string().datetime(),
    data: ProfileDocumentSchema,
  })
  .strict()

const DriveReplicaWorkoutsSchema = z
  .object({
    version: z.literal('1.0'),
    updated_at: z.string().datetime(),
    data: z.array(WorkoutSchema),
  })
  .strict()

export type DriveReplicaSyncResult = {
  status: 'synced' | 'conflict' | 'skipped'
  message: string
  entity?: 'profile' | 'workouts'
}

export const DRIVE_SYNC_RESULT_EVENT = 'ai-trainer:drive-sync-result'
export const GOOGLE_DRIVE_FILE_NAMES = {
  profile: 'user_profile.json',
  workouts: 'workouts_history.json',
} as const

const GOOGLE_OAUTH_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const DRIVE_TOKEN_EVENT = 'ai-trainer:drive-token-changed'
export const DRIVE_QUEUE_EVENT = 'ai-trainer:drive-queue-changed'
export const GOOGLE_DRIVE_TOKEN_STORAGE_KEY = 'ai-trainer.drive.access-token'
const GOOGLE_DRIVE_TOKEN_EXPIRY_BUFFER_MS = 60_000

const StoredGoogleDriveTokenSchema = z
  .object({
    access_token: z.string().min(1),
    expires_at: z.number().int().positive(),
  })
  .strict()

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
            callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void
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
  const persistedToken = readPersistedGoogleDriveToken()
  accessToken = persistedToken
  return persistedToken
}

export function isGoogleDriveConnected(): boolean {
  return getGoogleDriveAccessToken() !== null
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

export function subscribeToDriveSyncQueue(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(DRIVE_QUEUE_EVENT, onChange)
  return () => window.removeEventListener(DRIVE_QUEUE_EVENT, onChange)
}

function notifyDriveSyncQueueChanged(storage?: Storage): void {
  if (typeof window === 'undefined' || (storage && storage !== window.localStorage)) return
  window.dispatchEvent(new Event(DRIVE_QUEUE_EVENT))
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

export async function connectGoogleDrive(prompt: 'consent' | 'none' = 'consent'): Promise<string> {
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

  const response = await requestGoogleDriveToken(googleOauth, clientId, prompt)
  if (!response.expires_in || !Number.isFinite(response.expires_in) || response.expires_in <= 0) {
    throw new Error('Google nie zwróciło czasu ważności tokena. Połączenie nie zostało zapisane.')
  }

  const expiresAt = Date.now() + response.expires_in * 1000
  const persistedToken = StoredGoogleDriveTokenSchema.parse({
    access_token: response.access_token,
    expires_at: expiresAt,
  })
  try {
    window.localStorage.setItem(GOOGLE_DRIVE_TOKEN_STORAGE_KEY, JSON.stringify(persistedToken))
  } catch {
    throw new Error('Nie można zapisać sesji Google Drive w tej przeglądarce. Sprawdź ustawienia pamięci witryny.')
  }

  accessToken = persistedToken.access_token
  refreshGoogleDriveTokenState()
  return accessToken
}

export async function trySilentGoogleDriveConnection(): Promise<string | null> {
  if (!hasGoogleDriveClientId() || isGoogleDriveConnected()) {
    return getGoogleDriveAccessToken()
  }

  try {
    return await connectGoogleDrive('none')
  } catch {
    return null
  }
}

function requestGoogleDriveToken(
  googleOauth: NonNullable<NonNullable<Window['google']>['accounts']>['oauth2'],
  clientId: string,
  prompt: 'consent' | 'none',
): Promise<{ access_token: string; expires_in: number }> {
  if (!googleOauth) {
    return Promise.reject(new Error('Google Identity Services nie jest dostępne w tej przeglądarce.'))
  }

  return new Promise<{ access_token: string; expires_in: number }>((resolve, reject) => {
    const tokenClient = googleOauth.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response) => {
        if (response.access_token && response.expires_in) {
          resolve({ access_token: response.access_token, expires_in: response.expires_in })
          return
        }

        const message = response.error ?? 'Nie udało się uzyskać tokena dostępu dla Google Drive.'
        reject(new Error(message))
      },
      error_callback: (error) => {
        const message = error.error_description ?? error.error ?? 'Błąd logowania do Google Drive.'
        reject(new Error(message))
      },
    })

    tokenClient.requestAccessToken({ prompt })
  })
}

export function disconnectGoogleDrive(): void {
  accessToken = null
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(GOOGLE_DRIVE_TOKEN_STORAGE_KEY)
  }
  refreshGoogleDriveTokenState()
}

export function readPersistedGoogleDriveToken(storage?: Storage, now = Date.now()): string | null {
  const resolvedStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null)
  if (!resolvedStorage) return null

  const rawToken = resolvedStorage.getItem(GOOGLE_DRIVE_TOKEN_STORAGE_KEY)
  if (!rawToken) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(rawToken)
  } catch {
    resolvedStorage.removeItem(GOOGLE_DRIVE_TOKEN_STORAGE_KEY)
    return null
  }

  const result = StoredGoogleDriveTokenSchema.safeParse(parsed)
  if (!result.success || result.data.expires_at <= now + GOOGLE_DRIVE_TOKEN_EXPIRY_BUFFER_MS) {
    resolvedStorage.removeItem(GOOGLE_DRIVE_TOKEN_STORAGE_KEY)
    return null
  }

  return result.data.access_token
}

async function fetchDriveResource(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getGoogleDriveAccessToken()
  if (!token) {
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

export async function clearGoogleDriveAppData(): Promise<number> {
  const files = await listGoogleDriveAppDataFiles()
  let deletedCount = 0

  for (const file of files) {
    const response = await fetchDriveResource(`/drive/v3/files/${encodeURIComponent(file.id)}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const details = await response.text().catch(() => '')
      throw new Error(details || `Nie udało się usunąć pliku ${file.name} z Google Drive.`)
    }
    deletedCount += 1
  }

  return deletedCount
}

function getNewestDriveFile(files: GoogleDriveFile[], fileName: string): GoogleDriveFile | undefined {
  return files
    .filter((file) => file.name === fileName)
    .sort((left, right) => Date.parse(right.modifiedTime ?? '') - Date.parse(left.modifiedTime ?? ''))[0]
}

export async function readGoogleDriveJsonFile(fileName: string): Promise<unknown> {
  const files = await listGoogleDriveAppDataFiles()
  const file = getNewestDriveFile(files, fileName)
  if (!file) {
    return undefined
  }

  return readDriveFileJson(file)
}

export async function readProfileReplicaFromDrive(): Promise<ProfileDocument | undefined> {
  const files = await listGoogleDriveAppDataFiles()
  const remote = await readRemoteReplica(
    getNewestDriveFile(files, GOOGLE_DRIVE_FILE_NAMES.profile),
    ProfileDocumentSchema,
    DriveReplicaProfileSchema,
  )
  return remote?.data
}

export async function readWorkoutsReplicaFromDrive(): Promise<Workout[] | undefined> {
  const files = await listGoogleDriveAppDataFiles()
  const remote = await readRemoteReplica(
    getNewestDriveFile(files, GOOGLE_DRIVE_FILE_NAMES.workouts),
    WorkoutSchema.array(),
    DriveReplicaWorkoutsSchema,
  )
  return remote?.data
}

async function readDriveFileJson(file: GoogleDriveFile): Promise<unknown> {
  const response = await fetchDriveResource(`/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`)
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || `Nie udało się odczytać pliku ${file.name} z Google Drive.`)
  }

  const text = await response.text()
  if (!text.trim()) {
    return undefined
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Plik ${file.name} nie zawiera poprawnego JSON.`)
  }
}

export async function writeGoogleDriveJsonFile(
  fileName: string,
  value: unknown,
  existingFile?: GoogleDriveFile,
): Promise<GoogleDriveFile> {
  const token = getGoogleDriveAccessToken()
  if (!token) {
    throw new Error('Brak aktywnego połączenia z Google Drive.')
  }

  const payload = JSON.stringify(value, null, 2)
  if (existingFile) {
    const response = await fetchDriveResource(`/upload/drive/v3/files/${encodeURIComponent(existingFile.id)}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: payload,
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      throw new Error(details || `Nie udało się zaktualizować pliku ${fileName} w Google Drive.`)
    }

    const result = await response.json()
    return GoogleDriveFileSchema.parse({
      ...existingFile,
      ...result,
      id: result.id ?? existingFile.id,
      name: result.name ?? fileName,
      mimeType: result.mimeType ?? 'application/json',
    })
  }

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
  return 'Google Drive jest rozłączone. Kliknij „Połącz z Google Drive”, aby rozpocząć logowanie.'
}

export const DRIVE_SYNC_QUEUE_STORAGE_KEY = 'ai-trainer.drive-sync.queue'
export const DRIVE_SYNC_METADATA_STORAGE_KEY = 'ai-trainer.drive-sync.metadata'

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

const DriveSyncMetadataEntrySchema = z
  .object({
    file_id: z.string().trim().min(1),
    modified_time: z.string().datetime(),
    content_fingerprint: z.string().min(1),
    synced_at: z.string().datetime(),
  })
  .strict()

const DriveSyncMetadataSchema = z
  .object({
    profile: DriveSyncMetadataEntrySchema.optional(),
    workouts: DriveSyncMetadataEntrySchema.optional(),
  })
  .strict()

export type DriveSyncMetadata = z.infer<typeof DriveSyncMetadataSchema>

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

  let parsed: unknown
  try {
    parsed = JSON.parse(rawValue)
  } catch {
    throw new Error('Kolejka synchronizacji Google Drive jest uszkodzona. Nie została wyczyszczona.')
  }

  return z.array(DriveSyncQueueEntrySchema).parse(parsed)
}

export function writeDriveSyncQueue(entries: DriveSyncQueueEntry[], storage?: Storage): void {
  const resolvedStorage = resolveStorage(storage)
  if (!resolvedStorage) return
  resolvedStorage.setItem(DRIVE_SYNC_QUEUE_STORAGE_KEY, JSON.stringify(z.array(DriveSyncQueueEntrySchema).parse(entries)))
  notifyDriveSyncQueueChanged(storage)
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
  notifyDriveSyncQueueChanged(storage)
}

export function getDriveSyncQueueLength(storage?: Storage): number {
  return readDriveSyncQueue(storage).length
}

export function readDriveSyncMetadata(storage?: Storage): DriveSyncMetadata {
  const resolvedStorage = resolveStorage(storage)
  if (!resolvedStorage) return {}

  const rawValue = resolvedStorage.getItem(DRIVE_SYNC_METADATA_STORAGE_KEY)
  if (!rawValue) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(rawValue)
  } catch {
    throw new Error('Metadane synchronizacji Google Drive są uszkodzone. Nie zostały wyczyszczone.')
  }

  return DriveSyncMetadataSchema.parse(parsed)
}

function writeDriveSyncMetadata(metadata: DriveSyncMetadata, storage?: Storage): void {
  const resolvedStorage = resolveStorage(storage)
  if (!resolvedStorage) return
  resolvedStorage.setItem(DRIVE_SYNC_METADATA_STORAGE_KEY, JSON.stringify(DriveSyncMetadataSchema.parse(metadata)))
}

export function clearDriveSyncMetadata(storage?: Storage): void {
  const resolvedStorage = resolveStorage(storage)
  if (!resolvedStorage) return
  resolvedStorage.removeItem(DRIVE_SYNC_METADATA_STORAGE_KEY)
}

function getReplicaFingerprint(value: unknown): string {
  return JSON.stringify(value)
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

type RemoteReplica<T> = {
  data: T
  updatedAt?: string
  file: GoogleDriveFile
}

type SyncReplicaEntityResult = DriveReplicaSyncResult & {
  metadata?: {
    file_id: string
    modified_time: string
    content_fingerprint: string
  }
}

async function readRemoteReplica<T>(
  file: GoogleDriveFile | undefined,
  schema: z.ZodType<T>,
  envelopeSchema: z.ZodType<{ version: '1.0'; updated_at: string; data: T }>,
): Promise<RemoteReplica<T> | undefined> {
  if (!file) return undefined
  const value = await readDriveFileJson(file)
  const envelope = envelopeSchema.safeParse(value)
  if (envelope.success) {
    return { data: envelope.data.data, updatedAt: envelope.data.updated_at, file }
  }

  return { data: schema.parse(value), updatedAt: file.modifiedTime, file }
}

function areReplicaValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

async function syncReplicaEntity<T>(
  entity: DriveSyncQueueEntry['entity'],
  fileName: string,
  localValue: unknown,
  schema: z.ZodType<T>,
  envelopeSchema: z.ZodType<{ version: '1.0'; updated_at: string; data: T }>,
  files: GoogleDriveFile[],
  queue: DriveSyncQueueEntry[],
): Promise<SyncReplicaEntityResult> {
  const remoteFile = getNewestDriveFile(files, fileName)
  const local = localValue === undefined ? undefined : schema.parse(localValue)
  const pendingEntry = queue.find((entry) => entry.entity === entity)
  const metadata = readDriveSyncMetadata()[entity]

  if (
    local !== undefined &&
    !pendingEntry &&
    remoteFile?.modifiedTime &&
    metadata?.file_id === remoteFile.id &&
    metadata.modified_time === remoteFile.modifiedTime &&
    metadata.content_fingerprint === getReplicaFingerprint(local)
  ) {
    return {
      status: 'synced',
      message: '',
      metadata: {
        file_id: remoteFile.id,
        modified_time: remoteFile.modifiedTime,
        content_fingerprint: metadata.content_fingerprint,
      },
    }
  }

  const remote = await readRemoteReplica(remoteFile, schema, envelopeSchema)

  if (local === undefined) {
    return remote
      ? {
          status: 'conflict',
          entity,
          message: `Konflikt ${entity}: istnieją dane w Google Drive, ale brak ich lokalnie. Zaimportuj kopię przed synchronizacją.`,
        }
      : { status: 'synced', message: '' }
  }

  if (!remote) {
    await writeGoogleDriveJsonFile(fileName, {
      version: '1.0',
      updated_at: pendingEntry?.timestamp ?? new Date().toISOString(),
      data: local,
    })
    return { status: 'synced', message: '' }
  }

  if (areReplicaValuesEqual(local, remote.data)) {
    return { status: 'synced', message: '' }
  }

  if (!pendingEntry) {
    return {
      status: 'conflict',
      entity,
      message: `Konflikt ${entity}: dane lokalne i z Google Drive różnią się. Lokalna kolejka jest pusta, więc nic nie zostało nadpisane.`,
    }
  }

  if (compareDriveTimestamps(pendingEntry.timestamp, remote.updatedAt) !== 'local') {
    return {
      status: 'conflict',
      entity,
      message: `Konflikt ${entity}: wersja Google Drive jest nowsza lub nie ma wiarygodnego czasu. Lokalna kolejka została zachowana.`,
    }
  }

  await writeGoogleDriveJsonFile(
    fileName,
    { version: '1.0', updated_at: pendingEntry.timestamp, data: local },
    remote.file,
  )
  return { status: 'synced', message: '' }
}

function acknowledgeSyncedQueueEntries(queue: DriveSyncQueueEntry[]): void {
  const syncedIds = new Set(queue.map((entry) => entry.id))
  const currentQueue = readDriveSyncQueue()
  writeDriveSyncQueue(currentQueue.filter((entry) => !syncedIds.has(entry.id)))
}

export async function syncDriveReplica(localProfile: unknown, localWorkouts: unknown): Promise<DriveReplicaSyncResult> {
  if (!isGoogleDriveConnected()) {
    return { status: 'skipped', message: 'Google Drive nie jest połączone. Brak synchronizacji.' }
  }

  const queue = readDriveSyncQueue()
  const files = await listGoogleDriveAppDataFiles()

  const profileResult = await syncReplicaEntity(
    'profile',
    GOOGLE_DRIVE_FILE_NAMES.profile,
    localProfile,
    ProfileDocumentSchema,
    DriveReplicaProfileSchema,
    files,
    queue,
  )
  if (profileResult.status === 'conflict') return profileResult

  const workoutsResult = await syncReplicaEntity(
    'workouts',
    GOOGLE_DRIVE_FILE_NAMES.workouts,
    localWorkouts,
    WorkoutSchema.array(),
    DriveReplicaWorkoutsSchema,
    files,
    queue,
  )
  if (workoutsResult.status === 'conflict') return workoutsResult

  acknowledgeSyncedQueueEntries(queue)
  const shouldRefreshMetadata =
    queue.length > 0 ||
    (localProfile !== undefined && !getNewestDriveFile(files, GOOGLE_DRIVE_FILE_NAMES.profile)) ||
    (localWorkouts !== undefined && !getNewestDriveFile(files, GOOGLE_DRIVE_FILE_NAMES.workouts))
  const syncedFiles = shouldRefreshMetadata ? await listGoogleDriveAppDataFiles() : files
  const nextMetadata: DriveSyncMetadata = {}

  for (const [entity, value] of [
    ['profile', localProfile],
    ['workouts', localWorkouts],
  ] as const) {
    const file = getNewestDriveFile(syncedFiles, GOOGLE_DRIVE_FILE_NAMES[entity])
    if (!file?.modifiedTime || value === undefined) continue
    nextMetadata[entity] = {
      file_id: file.id,
      modified_time: file.modifiedTime,
      content_fingerprint: getReplicaFingerprint(value),
      synced_at: new Date().toISOString(),
    }
  }
  writeDriveSyncMetadata(nextMetadata)

  return {
    status: 'synced',
    message: 'Dane zostały zsynchronizowane z Google Drive AppData.',
  }
}
