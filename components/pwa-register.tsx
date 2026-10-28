'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function PwaRegister() {
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    let disposed = false
    let reloading = false
    let registration: ServiceWorkerRegistration | undefined

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
    }

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

    return () => {
      disposed = true
      window.removeEventListener('ai-trainer:apply-update', applyUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handleOnline)
      window.removeEventListener('online', handleOnline)
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
