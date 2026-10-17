import { Flame } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { WorkoutDashboardStats } from '@/lib/schemas'
import { formatPolishCount } from '@/lib/format'
import { cn } from '@/lib/utils'

export function StreakCard({
  stats,
  error,
}: {
  stats: WorkoutDashboardStats | null
  error: string
}) {
  const streak = stats?.streak_weeks

  return (
    <Card>
      <CardContent className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Seria treningowa</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
              {streak === undefined ? '—' : formatPolishCount(streak, 'tydzień', 'tygodnie', 'tygodni')}
            </p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <Flame className="size-6" aria-hidden="true" />
          </div>
        </div>

        <div aria-live="polite">
          {stats ? (
            <>
              <ul className="grid grid-cols-7 gap-1.5" aria-label="Aktywność w tym tygodniu">
                {stats.week_activity.map((day) => (
                  <li key={day.date} className="flex flex-col items-center gap-1.5">
                    <span
                      role="img"
                      className={cn(
                        'h-8 w-full rounded-md',
                        day.has_workout ? 'bg-primary' : 'bg-secondary',
                        day.is_today && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-card',
                      )}
                      aria-label={`${day.label}: ${day.has_workout ? 'trening wykonany' : 'brak treningu'}`}
                    />
                    <span className={cn('text-[11px]', day.is_today ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {day.label}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                {formatPolishCount(stats.current_week.workout_count, 'trening', 'treningi', 'treningów')} w tym tygodniu
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{error || 'Wczytywanie aktywności…'}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
