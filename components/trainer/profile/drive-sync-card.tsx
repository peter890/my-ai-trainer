'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Cloud, CloudOff, Loader2, LogOut, RefreshCw, Trash2 } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  connectGoogleDrive,
  clearGoogleDriveAppData,
  createDriveSyncSummary,
  disconnectGoogleDrive,
  getDriveSyncQueueLength,
  hasGoogleDriveClientId,
  isGoogleDriveConnected,
  subscribeToDriveSyncQueue,
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
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearError, setClearError] = useState('')

  useEffect(() => {
    const syncState = () => {
      try {
        const connected = isGoogleDriveConnected()
        setStatus(connected ? 'connected' : 'idle')
        setQueueLength(getDriveSyncQueueLength())
        setMessage(createDriveSyncSummary())
        setError('')
      } catch (cause) {
        setStatus('error')
        setError(cause instanceof Error ? cause.message : 'Nie można odczytać kolejki synchronizacji.')
        setMessage('Nie można odczytać kolejki synchronizacji Google Drive.')
      }
    }

    syncState()
    const unsubscribeToken = subscribeToGoogleDriveToken(syncState)
    const unsubscribeQueue = subscribeToDriveSyncQueue(() => {
      try {
        setQueueLength(getDriveSyncQueueLength())
      } catch (cause) {
        setStatus('error')
        setError(cause instanceof Error ? cause.message : 'Nie można odczytać kolejki synchronizacji.')
      }
    })
    return () => {
      unsubscribeToken()
      unsubscribeQueue()
    }
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

  const handleClearDriveData = async () => {
    if (!isGoogleDriveConnected()) {
      setClearError('Połącz się z Google Drive, aby wyczyścić dane zdalne.')
      return
    }

    setClearing(true)
    setClearError('')
    try {
      const deletedCount = await clearGoogleDriveAppData()
      setMessage(
        deletedCount === 0
          ? 'Google Drive nie zawierało danych AI Trainer. Dane lokalne pozostały bez zmian.'
          : `Usunięto ${deletedCount} plik${deletedCount === 1 ? '' : 'ów'} z Google Drive. Dane lokalne pozostały bez zmian.`,
      )
      setClearDialogOpen(false)
    } catch (cause) {
      setClearError(cause instanceof Error ? cause.message : 'Nie udało się wyczyścić danych Google Drive.')
    } finally {
      setClearing(false)
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

              {connected ? (
                <button
                  type="button"
                  onClick={() => { setClearError(''); setClearDialogOpen(true) }}
                  disabled={status === 'connecting' || syncing || clearing}
                  className={cn(
                    'flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors',
                    'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15',
                    (status === 'connecting' || syncing || clearing) && 'cursor-wait opacity-70',
                  )}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Wyczyść dane Google Drive
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
            Wejście na Profil nie uruchamia logowania. Token Drive jest zapisywany w pamięci przeglądarki do
            wygaśnięcia; po wygaśnięciu kliknij „Połącz” ponownie. Kod strony może odczytać zapisany token.
          </p>
          <p className="mt-2 text-foreground">
            Kolejka zmian: <span className="font-medium">{queueLength}</span>
          </p>
        </div>
      </CardContent>

      {clearDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !clearing) setClearDialogOpen(false)
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-drive-title"
            aria-describedby="clear-drive-description"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !clearing) setClearDialogOpen(false)
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
              <div>
                <h2 id="clear-drive-title" className="text-lg font-semibold">
                  Wyczyścić dane Google Drive?
                </h2>
                <p id="clear-drive-description" className="mt-2 text-sm text-muted-foreground">
                  Wszystkie pliki AI Trainer z folderu aplikacji Google Drive zostaną usunięte. Dane lokalne w tej przeglądarce pozostaną bez zmian.
                </p>
              </div>
            </div>
            {clearError ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                Nie udało się wyczyścić danych: {clearError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={clearing}
                onClick={() => setClearDialogOpen(false)}
                className="flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-secondary"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={clearing}
                onClick={() => void handleClearDriveData()}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:cursor-wait disabled:opacity-70"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {clearing ? 'Czyszczenie…' : 'Wyczyść dane'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </Card>
  )
}
