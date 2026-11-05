'use client'

import { Check, ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  exercises: { id: string; name: string; targetSets: number; targetReps: string }[]
  completedCounts: number[]
  activeIndex: number
  onSelect: (index: number) => void
  onAddExercise?: () => void
}

export function MobileSessionPlan({
  exercises,
  completedCounts,
  activeIndex,
  onSelect,
  onAddExercise,
}: Props) {
  const completedExercises = exercises.filter((_, i) => (completedCounts[i] ?? 0) >= exercises[i].targetSets)
  const pendingExercises = exercises.filter((_, i) => (completedCounts[i] ?? 0) < exercises[i].targetSets)
  const completedCount = completedExercises.length
  const totalCount = exercises.length

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-semibold">Plan sesji</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {completedCount}/{totalCount}
            </span>
            {onAddExercise && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onAddExercise}
                aria-label="Dodaj ćwiczenie"
                className="rounded-xl"
              >
                <Plus className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-0">
        {/* Ukończone - zwinięte */}
        {completedCount > 0 && (
          <details className="group mb-2">
            <summary
              className="flex items-center gap-2 cursor-pointer list-none p-2 rounded-lg hover:bg-secondary/50 transition-colors text-xs font-medium text-muted-foreground"
            >
              <span>Zakończone ({completedCount})</span>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="flex flex-col gap-1.5 pt-1 pl-2 border-l border-border/50">
              {exercises.map((exercise, i) => {
                const done = completedCounts[i] ?? 0
                const complete = done >= exercise.targetSets
                if (!complete) return null
                return (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => onSelect(i)}
                    className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <Check className="size-4 shrink-0 text-emerald-500" strokeWidth={3} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm">{exercise.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {done}/{exercise.targetSets} × {exercise.targetReps}
                    </span>
                  </button>
                )
              })}
            </div>
          </details>
        )}

        {/* Do wykonania - zawsze rozwiniete */}
        <div className="flex flex-col gap-1.5">
          {exercises.map((exercise, i) => {
            const done = completedCounts[i] ?? 0
            const complete = done >= exercise.targetSets
            const active = i === activeIndex
            if (complete) return null
            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onSelect(i)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 w-full text-left p-2 rounded-lg transition-colors',
                  active ? 'bg-secondary' : 'hover:bg-secondary/50',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    active
                      ? 'border-2 border-primary text-primary'
                      : 'border border-border text-muted-foreground',
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{exercise.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {done}/{exercise.targetSets} × {exercise.targetReps}
                </span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}