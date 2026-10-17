'use client'

import { useId, useState } from 'react'
import { Check, Minus, Pencil, Plus, Trash2, Wand2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { validateSetDraft, type SetDraft } from '@/lib/live-session'
import type { LoggedSet } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'

type Props = {
  sets: LoggedSet[]
  targetSets: number
  targetReps: string
  draft: SetDraft
  draftError: string
  onDraftChange: (draft: SetDraft) => void
  onLogSet: () => void
  onEditSet: (index: number, set: LoggedSet) => void
  onDeleteSet: (index: number) => void
}

const rirOptions = [0, 1, 2, 3, 4]

const formatKg = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 2 })

export function SetsTable({
  sets,
  targetSets,
  targetReps,
  draft,
  draftError,
  onDraftChange,
  onLogSet,
  onEditSet,
  onDeleteSet,
}: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingDraft, setEditingDraft] = useState<SetDraft | null>(null)
  const [editingError, setEditingError] = useState('')
  const activeNumber = sets.length + 1
  const pendingCount = Math.max(0, targetSets - activeNumber)
  const isExtra = activeNumber > targetSets

  const startEditing = (index: number) => {
    const set = sets[index]
    if (!set) return
    setEditingIndex(index)
    setEditingDraft({
      weight: String(set.weight),
      reps: String(set.reps),
      rir: set.rir,
    })
    setEditingError('')
  }

  const saveEditedSet = () => {
    if (editingIndex === null || !editingDraft) return
    const parsed = validateSetDraft(editingDraft)
    if (!parsed.success) {
      setEditingError(parsed.error.issues[0]?.message ?? 'Popraw wartości serii.')
      return
    }

    onEditSet(editingIndex, parsed.data)
    setEditingIndex(null)
    setEditingDraft(null)
    setEditingError('')
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="font-semibold">Serie</CardTitle>
        <span className="text-xs text-muted-foreground">
          {sets.length}/{targetSets} ukończone
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="grid grid-cols-[2rem_1fr_1fr_3.25rem_3.5rem] items-center gap-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>#</span>
          <span>kg</span>
          <span>Powt.</span>
          <span>RIR</span>
          <span className="sr-only">Akcje</span>
        </div>

        <ol className="flex flex-col gap-2">
          {sets.map((set, i) => (
            <li
              key={i}
              className="grid grid-cols-[2rem_1fr_1fr_3.25rem_3.5rem] items-center gap-2 rounded-xl bg-primary/[0.06] px-2 py-2.5 animate-in fade-in duration-300"
            >
              <span className="text-sm font-semibold text-muted-foreground">{i + 1}</span>
              {editingIndex === i && editingDraft ? (
                <>
                  <input
                    aria-label={`Ciężar serii ${i + 1} (kg)`}
                    type="text"
                    inputMode="decimal"
                    value={editingDraft.weight}
                    onChange={(event) =>
                      setEditingDraft({ ...editingDraft, weight: event.target.value })
                    }
                    className="h-9 min-w-0 rounded-md border border-input bg-background px-1 font-mono text-sm"
                  />
                  <input
                    aria-label={`Powtórzenia serii ${i + 1}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000}
                    step={1}
                    value={editingDraft.reps}
                    onChange={(event) =>
                      setEditingDraft({ ...editingDraft, reps: event.target.value })
                    }
                    className="h-9 min-w-0 rounded-md border border-input bg-background px-1 font-mono text-sm"
                  />
                  <select
                    aria-label={`RIR serii ${i + 1}`}
                    value={editingDraft.rir}
                    onChange={(event) =>
                      setEditingDraft({ ...editingDraft, rir: Number(event.target.value) })
                    }
                    className="h-9 min-w-0 rounded-md border border-input bg-background px-1 text-xs"
                  >
                    {rirOptions.map((rir) => (
                      <option key={rir} value={rir}>{rir === 4 ? '4+' : rir}</option>
                    ))}
                  </select>
                  <span className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={saveEditedSet}
                      className="flex size-7 items-center justify-center rounded-md text-primary hover:bg-primary/10"
                      aria-label={`Zapisz serię ${i + 1}`}
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(null)
                        setEditingDraft(null)
                        setEditingError('')
                      }}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
                      aria-label={`Anuluj edycję serii ${i + 1}`}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono text-sm font-semibold tabular-nums">{formatKg(set.weight)}</span>
                  <span className="font-mono text-sm font-semibold tabular-nums">{set.reps}</span>
                  <span className="text-xs text-muted-foreground">RIR {set.rir}</span>
                  <span className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => startEditing(i)}
                      disabled={editingIndex !== null}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label={`Edytuj serię ${i + 1}`}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSet(i)}
                      disabled={editingIndex !== null}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Usuń serię ${i + 1}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
        {editingError ? <p role="alert" className="text-sm text-destructive">{editingError}</p> : null}

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
          {draftError ? <p role="alert" className="mt-2 text-sm text-destructive">{draftError}</p> : null}
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
  value: string
  step: number
  onChange: (value: string) => void
}) {
  const id = useId()
  const numericValue = Number(value.replace(',', '.')) || 0
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs text-muted-foreground">
        {label}
      </label>
      <div className="flex h-12 items-center overflow-hidden rounded-xl border border-input bg-background">
        <button
          type="button"
          onClick={() => onChange(String(Math.max(0, Number((numericValue - step).toFixed(2)))))}
          className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={`Zmniejsz: ${label}`}
        >
          <Minus className="size-4" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-center font-mono text-lg font-semibold tabular-nums outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(String(Number((numericValue + step).toFixed(2))))}
          className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={`Zwiększ: ${label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}
