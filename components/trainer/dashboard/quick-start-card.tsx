import { Clock, Dumbbell, Play, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { liveWorkoutPlan } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'

const muscles = ['Klatka', 'Barki', 'Triceps']

export function QuickStartCard({
  liveActive,
  onStart,
  className,
}: {
  liveActive: boolean
  onStart: () => void
  className?: string
}) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <CardContent className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Zaplanowane na dziś
          </span>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Push A</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tydzień 6 · mezocykl hipertroficzny</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Dumbbell className="size-4" aria-hidden="true" />
              {liveWorkoutPlan.length} ćwiczeń
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              ok. 60 min
            </span>
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label="Partie mięśniowe">
            {muscles.map((m) => (
              <li key={m} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                {m}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98] md:w-auto"
        >
          <Play className="size-5 fill-current" aria-hidden="true" />
          {liveActive ? 'Wróć do treningu' : 'Rozpocznij trening'}
        </button>
      </CardContent>
    </Card>
  )
}
