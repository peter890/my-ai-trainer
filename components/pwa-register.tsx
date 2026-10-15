'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline shell is optional until the service worker can be registered.
    })
  }, [])

  return null
}
