import { SkipForward, Timer } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDuration } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'

type Props = {
  remaining: number
  total: number
  paused: boolean
  onAdjust: (delta: number) => void
  onSkip: () => void
}

const RADIUS = 30
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function RestTimer({ remaining, total, paused, onAdjust, onSkip }: Props) {
  const resting = remaining > 0
  const ratio = total > 0 ? remaining / total : 0

  return (
    <Card className={cn('transition-colors', resting ? 'ring-primary/25' : 'ring-foreground/10')}>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative size-20 shrink-0">
            <svg viewBox="0 0 72 72" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="36" cy="36" r={RADIUS} fill="none" strokeWidth="6" className="stroke-secondary" />
              <circle
                cx="36"
                cy="36"
                r={RADIUS}
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
                className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <Timer
              className={cn('absolute inset-0 m-auto size-6', resting ? 'text-primary' : 'text-muted-foreground')}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0" role="timer" aria-live="off">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {paused ? 'Wstrzymano' : resting ? 'Przerwa' : 'Gotowy'}
            </p>
            <p className="font-mono text-3xl font-semibold tabular-nums">
              {formatDuration(remaining, false)}
              <span className="text-base text-muted-foreground"> / {formatDuration(total, false)}</span>
            </p>
            {!resting && <p className="text-sm text-primary">Czas na kolejną serię!</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <TimerButton onClick={() => onAdjust(-30)}>-30s</TimerButton>
          <TimerButton onClick={() => onAdjust(30)}>+30s</TimerButton>
          <TimerButton onClick={onSkip} disabled={!resting} accent>
            <SkipForward className="size-4" aria-hidden="true" />
            Pomiń
          </TimerButton>
        </div>
      </CardContent>
    </Card>
  )
}

function TimerButton({
  children,
  onClick,
  disabled,
  accent,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  accent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-40',
        accent
          ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
          : 'border-border bg-secondary/50 hover:bg-secondary',
      )}
    >
      {children}
    </button>
  )
}
