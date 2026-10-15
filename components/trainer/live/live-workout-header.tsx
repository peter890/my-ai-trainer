'use client'

import { ChevronDown, Pause, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  elapsed: number
  paused: boolean
  position: string
  progress: number
  onTogglePause: () => void
  onFinish: () => void
  onMinimize: () => void
}

export function LiveWorkoutHeader({
  title,
  elapsed,
  paused,
  position,
  progress,
  onTogglePause,
  onFinish,
  onMinimize,
}: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-3 md:gap-4 md:px-8">
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={onMinimize}
          aria-label="Zminimalizuj trening"
          className="rounded-xl"
        >
          <ChevronDown className="size-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {position}
          </p>
          <h1 className="truncate text-base font-semibold md:text-lg">{title}</h1>
        </div>

        <div
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5"
          aria-live="off"
        >
          <span
            className={cn('size-2 rounded-full', paused ? 'bg-warning' : 'animate-pulse bg-primary')}
            aria-hidden="true"
          />
          <span className="font-mono text-sm font-semibold tabular-nums md:text-base">
            <span className="sr-only">Czas sesji: </span>
            {formatDuration(elapsed)}
          </span>
        </div>

        <Button
          variant="outline"
          size="icon-lg"
          onClick={onTogglePause}
          aria-label={paused ? 'Wznów sesję' : 'Wstrzymaj sesję'}
          className={cn('rounded-xl', paused && 'border-warning/50 text-warning')}
        >
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          onClick={onFinish}
          className="rounded-xl px-3"
          aria-label="Zakończ sesję treningową"
        >
          <Square className="size-3.5 fill-current" aria-hidden="true" />
          <span className="hidden sm:inline">Zakończ</span>
        </Button>
      </div>
      <div className="h-1 w-full bg-secondary" aria-hidden="true">
        <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
    </header>
  )
}
