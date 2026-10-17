'use client'

import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { WeightChart } from '../weight-chart'

type Props = {
  weights: { date: string; weight: number }[]
  onAdd: (weight: number) => void
}

export function WeightHistoryCard({ weights, onAdd }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const min = Math.min(...weights.map((w) => w.weight))
  const max = Math.max(...weights.map((w) => w.weight))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = Number(value.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed < 30 || parsed > 300) {
      setError('Podaj prawidłową wagę z zakresu 30–300 kg.')
      return
    }
    onAdd(Math.round(parsed * 10) / 10)
    setValue('')
    setError('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Historia wagi</CardTitle>
        <CardDescription>
          Zakres: {min.toLocaleString('pl-PL')}–{max.toLocaleString('pl-PL')} kg
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <WeightChart data={weights} className="h-52" />
        <form onSubmit={submit} className="flex gap-2">
          <label htmlFor="new-weight" className="sr-only">
            Nowy pomiar wagi w kg
          </label>
          <Input
            id="new-weight"
            inputMode="decimal"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
            placeholder="Nowy pomiar, np. 81,2"
            className="h-11"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'new-weight-error' : undefined}
          />
          <button
            type="submit"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="size-4" aria-hidden="true" />
            Dodaj
          </button>
        </form>
        {error ? <p id="new-weight-error" role="alert" className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
