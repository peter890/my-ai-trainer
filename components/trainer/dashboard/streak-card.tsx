import { Flame } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const week = [
  { day: 'Pn', done: true },
  { day: 'Wt', done: true },
  { day: 'Śr', done: true, today: true },
  { day: 'Cz', done: false },
  { day: 'Pt', done: false },
  { day: 'So', done: false },
  { day: 'Nd', done: false },
]

export function StreakCard() {
  return (
    <Card>
      <CardContent className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Seria treningowa</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
              12 <span className="text-base font-normal text-muted-foreground">tygodni</span>
            </p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <Flame className="size-6" aria-hidden="true" />
          </div>
        </div>

        <div>
          <ul className="grid grid-cols-7 gap-1.5" aria-label="Ten tydzień">
            {week.map((d) => (
              <li key={d.day} className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'h-8 w-full rounded-md',
                    d.done ? 'bg-primary' : 'bg-secondary',
                    d.today && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-card',
                  )}
                  aria-label={`${d.day}: ${d.done ? 'trening wykonany' : 'brak treningu'}`}
                />
                <span className={cn('text-[11px]', d.today ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {d.day}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">3 z 4 zaplanowanych treningów w tym tygodniu</p>
        </div>
      </CardContent>
    </Card>
  )
}
