import { ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { numberFormat, workoutTypeMeta, type WorkoutLog } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'

const dayFormatter = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', weekday: 'short' })

type Props = {
  logs: WorkoutLog[]
  selected: string
  onSelect: (date: string) => void
}

export function WorkoutLogList({ logs, selected, onSelect }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Dziennik treningów</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Brak treningów w tym miesiącu.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {logs.map((log) => (
              <li key={log.date}>
                <button
                  type="button"
                  onClick={() => onSelect(log.date)}
                  aria-current={log.date === selected ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors',
                    log.date === selected ? 'bg-secondary' : 'hover:bg-secondary/50',
                  )}
                >
                  <span className={cn('h-9 w-1 shrink-0 rounded-full', workoutTypeMeta[log.type].dot)} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{log.title}</span>
                    <span className="block text-xs text-muted-foreground first-letter:uppercase">
                      {dayFormatter.format(new Date(`${log.date}T12:00:00`))} · {log.duration} min
                    </span>
                  </span>
                  <span className="text-right text-xs text-muted-foreground tabular-nums">
                    {log.volume > 0 ? `${numberFormat.format(log.volume)} kg` : 'cardio'}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
