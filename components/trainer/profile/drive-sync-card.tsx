'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Cloud, CloudOff, Loader2, LogOut, RefreshCw } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  connectGoogleDrive,
  createDriveSyncSummary,
  disconnectGoogleDrive,
  getDriveSyncQueueLength,
  hasGoogleDriveClientId,
  isGoogleDriveConnected,
  subscribeToGoogleDriveToken,
  syncDriveReplica,
} from '@/lib/google-drive'
import { getProfile, getWorkouts } from '@/lib/repositories'
import { cn } from '@/lib/utils'

export function DriveSyncCard() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [message, setMessage] = useState(createDriveSyncSummary())
  const [error, setError] = useState('')
  const [queueLength, setQueueLength] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const syncState = () => {
      const connected = isGoogleDriveConnected()
      setStatus(connected ? 'connected' : 'idle')
      setQueueLength(getDriveSyncQueueLength())
      setMessage(createDriveSyncSummary())
      setError('')
    }

    syncState()
    return subscribeToGoogleDriveToken(syncState)
  }, [])

  const handleConnect = async () => {
    setStatus('connecting')
    setError('')
    setMessage('Łączenie z Google Drive…')

    try {
      await connectGoogleDrive()
      setStatus('connected')
      setQueueLength(getDriveSyncQueueLength())
      setMessage(createDriveSyncSummary())
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Nie udało się połączyć z Google Drive.')
      setMessage('Brak aktywnego połączenia z Google Drive.')
    }
  }

  const handleDisconnect = () => {
    disconnectGoogleDrive()
    setStatus('idle')
    setQueueLength(getDriveSyncQueueLength())
    setMessage(createDriveSyncSummary())
    setError('')
  }

  const handleSyncNow = async () => {
    if (!isGoogleDriveConnected()) {
      setStatus('error')
      setError('Połącz się z Google Drive, aby zsynchronizować dane.')
      setMessage('Google Drive nie jest połączone. Brak synchronizacji.')
      return
    }

    setSyncing(true)
    setError('')
    setMessage('Synchronizacja danych z IndexedDB do Google Drive…')

    try {
      const [profile, workouts] = await Promise.all([getProfile(), getWorkouts()])
      const result = await syncDriveReplica(profile, workouts)

      setStatus(result.status === 'synced' ? 'connected' : 'error')
      setQueueLength(getDriveSyncQueueLength())
      setMessage(result.message)
      setError(result.status === 'conflict' ? result.message : '')
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Nie udało się zsynchronizować danych z Google Drive.')
      setMessage('Synchronizacja zakończyła się błędem.')
    } finally {
      setSyncing(false)
    }
  }

  const connected = status === 'connected' || isGoogleDriveConnected()
  const canConnect = hasGoogleDriveClientId()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <Cloud className="size-4 text-primary" aria-hidden="true" />
          Synchronizacja Google Drive
        </CardTitle>
        <CardDescription>Replika danych w AppDataFolder z zachowaniem trybu offline-first.</CardDescription>
        <CardAction>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
              connected
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-border bg-secondary/40 text-muted-foreground',
            )}
          >
            {connected ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <CloudOff className="size-3.5" aria-hidden="true" />}
            {connected ? 'Połączone' : 'Offline'}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
          {message}
        </div>

        <div className="flex flex-col gap-2">
          {!canConnect ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Brakuje zmiennej środowiskowej <span className="font-medium">NEXT_PUBLIC_GOOGLE_CLIENT_ID</span>. Google OAuth
              jest przygotowane do aktywacji po dodaniu client ID.
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void (connected ? handleDisconnect() : handleConnect())}
                disabled={status === 'connecting'}
                className={cn(
                  'flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors',
                  connected
                    ? 'border-border bg-secondary/60 text-foreground hover:bg-secondary'
                    : 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15',
                  status === 'connecting' && 'cursor-wait opacity-70',
                )}
              >
                {status === 'connecting' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Łączenie…
                  </>
                ) : connected ? (
                  <>
                    <LogOut className="size-4" aria-hidden="true" />
                    Rozłącz
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-4" aria-hidden="true" />
                    Połącz z Google Drive
                  </>
                )}
              </button>

              {connected ? (
                <button
                  type="button"
                  onClick={() => void handleSyncNow()}
                  disabled={status === 'connecting' || syncing}
                  className={cn(
                    'flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors',
                    'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15',
                    (status === 'connecting' || syncing) && 'cursor-wait opacity-70',
                  )}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Synchronizacja…
                    </>
                  ) : (
                    <>
                      <Cloud className="size-4" aria-hidden="true" />
                      Synchronizuj teraz
                    </>
                  )}
                </button>
              ) : null}
            </>
          )}

          {error ? (
            <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Status:</p>
          <p className="mt-1">
            Klucz Gemini pozostaje lokalny, a token Google Drive jest przechowywany tylko w pamięci przeglądarki.
          </p>
          <p className="mt-2 text-foreground">
            Kolejka zmian: <span className="font-medium">{queueLength}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
