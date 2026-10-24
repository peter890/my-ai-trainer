import { Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  exercises: { id: string; name: string; targetSets: number; targetReps: string }[]
  completedCounts: number[]
  activeIndex: number
  onSelect: (index: number) => void
}

export function ExerciseQueue({ exercises, completedCounts, activeIndex, onSelect }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Plan sesji</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-1">
          {exercises.map((exercise, i) => {
            const done = completedCounts[i] ?? 0
            const complete = done >= exercise.targetSets
            const active = i === activeIndex
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors',
                    active ? 'bg-secondary' : 'hover:bg-secondary/50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      complete
                        ? 'bg-primary text-primary-foreground'
                        : active
                          ? 'border-2 border-primary text-primary'
                          : 'border border-border text-muted-foreground',
                    )}
                  >
                    {complete ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm', active && 'font-semibold')}>{exercise.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {done}/{exercise.targetSets} serii · {exercise.targetReps} powt.
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
