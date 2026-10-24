'use client'

import { useState } from 'react'
import { Check, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Exercise } from '@/lib/schemas'

type Props = {
  exercises: Exercise[]
  selectedIds: string[]
  onSelect: (exercise: Exercise) => void
  onRemove: (exerciseId: string) => void
}

export function FreeExercisePicker({ exercises, selectedIds, onSelect, onRemove }: Props) {
  const [query, setQuery] = useState('')
  const visible = exercises
    .filter((exercise) => exercise.active)
    .filter((exercise) => exercise.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 12)

  const selectedExercises = selectedIds
    .map((id) => exercises.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is Exercise => Boolean(exercise))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <Plus className="size-4 text-primary" aria-hidden="true" />
          Dodaj ćwiczenie
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {selectedExercises.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Kolejka ćwiczeń</p>
            <div className="flex flex-col gap-1.5">
              {selectedExercises.map((exercise, index) => (
                <div key={exercise.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm">
                  <span className="w-5 text-xs tabular-nums text-muted-foreground">{index + 1}.</span>
                  <span className="min-w-0 flex-1 truncate">{exercise.name}</span>
                  <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => onRemove(exercise.id)} aria-label={`Usuń ${exercise.name} z kolejki`}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj ćwiczenia…"
            aria-label="Szukaj ćwiczenia do treningu swobodnego"
            className="h-11 pl-9"
          />
        </div>
        {visible.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {visible.map((exercise) => {
              const selected = selectedIds.includes(exercise.id)
              return (
                <Button
                  key={exercise.id}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-11 justify-between whitespace-normal text-left"
                  disabled={selected}
                  onClick={() => onSelect(exercise)}
                >
                  <span>{exercise.name}</span>
                  {selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : <Plus className="size-4 shrink-0" aria-hidden="true" />}
                </Button>
              )
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            Nie znaleziono aktywnego ćwiczenia.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
