'use client'

import { useState } from 'react'
import { Cloud, RefreshCw } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export function DriveSyncCard() {
  const [autoSync, setAutoSync] = useState(true)
  const [wifiOnly, setWifiOnly] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState('dziś, 07:42')

  const syncNow = () => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setLastSync('przed chwilą')
    }, 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <Cloud className="size-4 text-primary" aria-hidden="true" />
          Synchronizacja Google Drive
        </CardTitle>
        <CardDescription>Kopia zapasowa treningów i ustawień.</CardDescription>
        <CardAction>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
            Aktywna
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
            K
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">kamil.nowak@gmail.com</p>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Ostatnia synchronizacja: {lastSync}
            </p>
          </div>
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            aria-label="Synchronizuj teraz"
            className="flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw className={cn('size-4', syncing && 'animate-spin')} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Wykorzystane miejsce</span>
            <span className="tabular-nums">24 MB / 15 GB</span>
          </div>
          <Progress value={4} aria-label="Wykorzystane miejsce na Dysku" />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="auto-sync" className="font-normal">
              Automatyczna synchronizacja po treningu
            </Label>
            <Switch id="auto-sync" checked={autoSync} onCheckedChange={setAutoSync} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="wifi-only" className="font-normal">
              Tylko przez Wi-Fi
            </Label>
            <Switch id="wifi-only" checked={wifiOnly} onCheckedChange={setWifiOnly} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
