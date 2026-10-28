'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DRIVE_QUEUE_EVENT,
  DRIVE_SYNC_RESULT_EVENT,
  isGoogleDriveConnected,
  syncDriveReplica,
  trySilentGoogleDriveConnection,
} from '@/lib/google-drive'
import { getProfile, getWorkouts } from '@/lib/repositories'

export function PwaRegister() {
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    void trySilentGoogleDriveConnection()

    if (!('serviceWorker' in navigator)) {
      return
    }

    let disposed = false
    let reloading = false
    let registration: ServiceWorkerRegistration | undefined
    let syncInProgress = false

    const syncPendingChanges = async () => {
      if (syncInProgress) return

      syncInProgress = true
      try {
        await trySilentGoogleDriveConnection()
        if (!isGoogleDriveConnected()) return

        const [profile, workouts] = await Promise.all([getProfile(), getWorkouts()])
        const result = await syncDriveReplica(profile, workouts)
        window.dispatchEvent(new CustomEvent(DRIVE_SYNC_RESULT_EVENT, { detail: result }))
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Nie udało się zsynchronizować danych z Google Drive.'
        window.dispatchEvent(new CustomEvent(DRIVE_SYNC_RESULT_EVENT, { detail: { status: 'error', message } }))
      } finally {
        syncInProgress = false
      }
    }

    const applyUpdate = () => {
      if (reloading || !registration?.waiting) return

      reloading = true
      const reload = () => window.location.reload()
      navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true })
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void registration?.update().catch(() => undefined)
      }
    }

    const handleOnline = () => {
      void registration?.update().catch(() => undefined)
      void syncPendingChanges()
    }
    const handleQueueChanged = () => void syncPendingChanges()

    void navigator.serviceWorker
      .register('/sw.js')
      .then((nextRegistration) => {
        if (disposed) return
        registration = nextRegistration

        const markUpdateReady = () => {
          if (!navigator.serviceWorker.controller) return
          setUpdateReady(true)
        }

        if (registration.waiting) markUpdateReady()

        registration.addEventListener('updatefound', () => {
          const worker = registration?.installing
          if (!worker) return

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              markUpdateReady()
            }
          })
        })
        void registration.update().catch(() => undefined)
      })
      .catch(() => {
        // Offline support is optional when the hosting environment blocks registration.
      })

    window.addEventListener('ai-trainer:apply-update', applyUpdate)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handleOnline)
    window.addEventListener('online', handleOnline)
    window.addEventListener(DRIVE_QUEUE_EVENT, handleQueueChanged)
    void syncPendingChanges()

    return () => {
      disposed = true
      window.removeEventListener('ai-trainer:apply-update', applyUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handleOnline)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener(DRIVE_QUEUE_EVENT, handleQueueChanged)
    }
  }, [])

  if (!updateReady) return null

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-primary/30 bg-card p-3 text-sm text-card-foreground shadow-lg md:inset-x-auto md:right-4">
      <span>Dostępna jest nowa wersja aplikacji.</span>
      <Button
        type="button"
        size="sm"
        onClick={() => window.dispatchEvent(new Event('ai-trainer:apply-update'))}
      >
        Aktualizuj
      </Button>
    </div>
  )
}
