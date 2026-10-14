'use client'

import { useState } from 'react'
import { BatteryLow, BatteryFull, BatteryMedium, CircleAlert, Clock, Loader2, Sparkles, Trophy, Weight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { numberFormat, unfinalizedWorkout } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'
import { AiFeedbackCard } from './ai-feedback-card'

const energyLabels = ['Wyczerpany', 'Zmęczony', 'W normie', 'Dobrze', 'Świetnie']

type Status = 'idle' | 'loading' | 'done'

export function PostWorkoutFinalization({ onFinalized }: { onFinalized: () => void }) {
  const [energy, setEnergy] = useState(3)
  const [notes, setNotes] = useState('Ból nadgarstka przy wyciskaniu leżąc. Zadyszka na bieżni.')
  const [status, setStatus] = useState<Status>('idle')

  const finalize = () => {
    setStatus('loading')
    setTimeout(() => setStatus('done'), 1800)
  }

  const w = unfinalizedWorkout

  return (
    <section aria-labelledby="finalize-title" className="grid gap-4 lg:grid-cols-2">
      <Card className="ring-warning/30">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <CircleAlert className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="finalize-title" className="font-semibold">
                Niesfinalizowany trening z dziś
              </h2>
              <p className="text-sm text-muted-foreground">
                {w.title} · {w.date}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Clock} label="Czas" value={`${w.duration} min`} />
            <Stat icon={Weight} label="Objętość" value={`${numberFormat.format(w.volume)} kg`} />
            <Stat icon={BatteryFull} label="Serie" value={`${w.sets}`} />
            <Stat icon={Trophy} label="Rekordy" value={`${w.prs} PR`} accent />
          </dl>

          <fieldset disabled={status !== 'idle'}>
            <legend className="mb-2 text-sm font-medium">Poziom energii po treningu</legend>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((value) => {
                const Icon = value <= 2 ? BatteryLow : value === 3 ? BatteryMedium : BatteryFull
                const active = energy === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEnergy(value)}
                    aria-pressed={active}
                    aria-label={`${value} — ${energyLabels[value - 1]}`}
                    className={cn(
                      'flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-60',
                      active
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {value}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{energyLabels[energy - 1]}</p>
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="workout-notes">Notatki po treningu (opcjonalnie)</Label>
            <Textarea
              id="workout-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={status !== 'idle'}
              placeholder="Np. ból nadgarstka przy wyciskaniu, zadyszka na bieżni…"
              className="min-h-24 resize-none"
            />
          </div>

          <button
            type="button"
            onClick={finalize}
            disabled={status !== 'idle'}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Gemini analizuje trening…
              </>
            ) : status === 'done' ? (
              'Trening sfinalizowany'
            ) : (
              <>
                <Sparkles className="size-5" aria-hidden="true" />
                Sfinalizuj i wygeneruj analizę AI
              </>
            )}
          </button>
        </CardContent>
      </Card>

      <AiFeedbackCard status={status} onArchive={onFinalized} />
    </section>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Clock
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className={cn('mt-1 text-lg font-semibold tabular-nums', accent && 'text-primary')}>{value}</dd>
    </div>
  )
}
