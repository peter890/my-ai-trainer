import { History, Lightbulb, Repeat2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  name: string
  note: string
  workoutNote: string
  onWorkoutNoteChange: (note: string) => void
  lastTime: string
  targetSets: number
  targetReps: string
  doneSets: number
  hasAlternatives: boolean
  onSwap: () => void
}

export function ExerciseCard({
  name,
  note,
  workoutNote,
  onWorkoutNoteChange,
  lastTime,
  targetSets,
  targetReps,
  doneSets,
  hasAlternatives,
  onSwap,
}: Props) {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-primary">
              Seria {Math.min(doneSets + 1, targetSets)} z {targetSets} · cel {targetReps} powt.
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-balance md:text-2xl">{name}</h2>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={onSwap}
            disabled={!hasAlternatives || doneSets > 0}
            className="shrink-0 rounded-xl"
          >
            <Repeat2 className="size-4" aria-hidden="true" />
            Zamień
          </Button>
        </div>
        {doneSets > 0 ? (
          <p className="-mt-2 text-xs text-muted-foreground">
            Zamiana jest dostępna przed zapisaniem pierwszej serii, aby zachować poprawną historię ćwiczenia.
          </p>
        ) : null}

        <div className="flex gap-3 rounded-xl border border-warning/25 bg-warning/10 p-3">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-warning">Notatka techniczna</p>
            <p className="mt-0.5 text-sm leading-relaxed text-foreground/90">{note}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="workout-exercise-note" className="text-sm font-medium">
            Notatka z ćwiczenia
          </label>
          <Textarea
            id="workout-exercise-note"
            value={workoutNote}
            onChange={(event) => onWorkoutNoteChange(event.target.value)}
            maxLength={4000}
            placeholder="Zapisz odczucia, ból lub uwagi z tego ćwiczenia"
            className="min-h-20"
          />
          <p className="text-right text-xs text-muted-foreground">{workoutNote.length}/4000</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          <History className="size-3.5" aria-hidden="true" />
          <span>Ostatnio:</span>
          <span className="font-mono text-foreground/80">{lastTime}</span>
        </div>
      </CardContent>
    </Card>
  )
}
