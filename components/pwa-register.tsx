'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    let disposed = false

    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (disposed) return
        void registration.update()
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          if (!worker) return

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new Event('ai-trainer:service-worker-update'))
            }
          })
        })
      })
      .catch(() => {
        // Offline support is optional when the hosting environment blocks registration.
      })

    return () => {
      disposed = true
    }
  }, [])

  return null
}
