'use client'

import { useId } from 'react'
import { Check, Minus, Plus, Wand2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LoggedSet } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'

type Props = {
  sets: LoggedSet[]
  targetSets: number
  targetReps: string
  draft: LoggedSet
  onDraftChange: (draft: LoggedSet) => void
  onLogSet: () => void
}

const rirOptions = [0, 1, 2, 3, 4]

const formatKg = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 2 })

export function SetsTable({ sets, targetSets, targetReps, draft, onDraftChange, onLogSet }: Props) {
  const activeNumber = sets.length + 1
  const pendingCount = Math.max(0, targetSets - activeNumber)
  const isExtra = activeNumber > targetSets

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="font-semibold">Serie</CardTitle>
        <span className="text-xs text-muted-foreground">
          {sets.length}/{targetSets} ukończone
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="grid grid-cols-[2.25rem_1fr_1fr_3.5rem_2.25rem] items-center gap-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>#</span>
          <span>kg</span>
          <span>Powt.</span>
          <span>RIR</span>
          <span className="sr-only">Status</span>
        </div>

        <ol className="flex flex-col gap-2">
          {sets.map((set, i) => (
            <li
              key={i}
              className="grid grid-cols-[2.25rem_1fr_1fr_3.5rem_2.25rem] items-center gap-2 rounded-xl bg-primary/[0.06] px-2 py-2.5 animate-in fade-in duration-300"
            >
              <span className="text-sm font-semibold text-muted-foreground">{i + 1}</span>
              <span className="font-mono text-sm font-semibold tabular-nums">{formatKg(set.weight)}</span>
              <span className="font-mono text-sm font-semibold tabular-nums">{set.reps}</span>
              <span className="text-xs text-muted-foreground">RIR {set.rir}</span>
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                <span className="sr-only">Ukończona</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-1 rounded-2xl border border-primary/40 bg-primary/[0.04] p-3 ring-4 ring-primary/5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">
              {isExtra ? 'Seria dodatkowa' : `Seria ${activeNumber}`}
              <span className="ml-2 text-xs font-normal text-muted-foreground">cel {targetReps}</span>
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              <Wand2 className="size-3 text-primary" aria-hidden="true" />
              Smart Fill
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stepper
              label="Ciężar (kg)"
              value={draft.weight}
              step={2.5}
              onChange={(weight) => onDraftChange({ ...draft, weight })}
            />
            <Stepper
              label="Powtórzenia"
              value={draft.reps}
              step={1}
              onChange={(reps) => onDraftChange({ ...draft, reps })}
            />
          </div>

          <fieldset className="mt-3">
            <legend className="mb-1.5 text-xs text-muted-foreground">RIR / zmęczenie (powt. w zapasie)</legend>
            <div className="grid grid-cols-5 gap-1.5">
              {rirOptions.map((rir) => (
                <button
                  key={rir}
                  type="button"
                  onClick={() => onDraftChange({ ...draft, rir })}
                  aria-pressed={draft.rir === rir}
                  className={cn(
                    'h-10 rounded-lg border text-sm font-medium transition-colors',
                    draft.rir === rir
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {rir === 4 ? '4+' : rir}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={onLogSet}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="size-6" strokeWidth={3} aria-hidden="true" />
            Zaloguj serię
          </button>
        </div>

        {Array.from({ length: pendingCount }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground"
          >
            <span className="w-6 font-semibold">{activeNumber + i + 1}</span>
            <span>Oczekuje · cel {targetReps} powt.</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function Stepper({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number
  step: number
  onChange: (value: number) => void
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs text-muted-foreground">
        {label}
      </label>
      <div className="flex h-12 items-center overflow-hidden rounded-xl border border-input bg-background">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - step))}
          className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={`Zmniejsz: ${label}`}
        >
          <Minus className="size-4" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-full min-w-0 flex-1 bg-transparent text-center font-mono text-lg font-semibold tabular-nums outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(value + step)}
          className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={`Zwiększ: ${label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}
