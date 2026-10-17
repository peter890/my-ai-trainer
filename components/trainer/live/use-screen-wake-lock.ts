'use client'

import { useEffect, useState } from 'react'

type WakeLockSentinel = {
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
}

type ScreenWakeLock = {
  request: (type: 'screen') => Promise<WakeLockSentinel>
}

type WakeLockStatus = 'inactive' | 'active' | 'unsupported' | 'error'

function getScreenWakeLock(): ScreenWakeLock | undefined {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return undefined
  return (navigator as Navigator & { wakeLock: ScreenWakeLock }).wakeLock
}

export function useScreenWakeLock(enabled: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>('inactive')

  useEffect(() => {
    if (!enabled) return
    const wakeLock = getScreenWakeLock()
    if (!wakeLock) return

    let active = true
    let sentinel: WakeLockSentinel | undefined

    const release = () => {
      const current = sentinel
      sentinel = undefined
      if (current) {
        void current.release().catch(() => {
          if (active) setStatus('error')
        })
      }
    }

    const request = async () => {
      if (!active || document.visibilityState !== 'visible' || sentinel) return
      try {
        const requestedSentinel = await wakeLock.request('screen')
        if (!active || document.visibilityState !== 'visible') {
          await requestedSentinel.release()
          return
        }

        sentinel = requestedSentinel
        setStatus('active')
        requestedSentinel.addEventListener('release', () => {
          if (sentinel === requestedSentinel) sentinel = undefined
          if (active) setStatus('inactive')
        })
      } catch {
        if (active) setStatus('error')
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void request()
      } else {
        release()
        setStatus('inactive')
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    void request()

    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisibilityChange)
      release()
    }
  }, [enabled])

  if (!enabled) return 'inactive'
  if (!getScreenWakeLock()) return 'unsupported'
  return status
}
