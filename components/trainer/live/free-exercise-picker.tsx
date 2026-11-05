'use client'

import { useState } from 'react'
import { Check, Plus, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Exercise } from '@/lib/schemas'

type Props = {
  exercises: Exercise[]
  selectedIds: string[]
  onSelect: (exercise: Exercise) => void
  onRemove: (exerciseId: string) => void
  isMobileSheet?: boolean
  onClose?: () => void
}

export function FreeExercisePicker({
  exercises,
  selectedIds,
  onSelect,
  onRemove,
  isMobileSheet = false,
  onClose,
}: Props) {
  const [query, setQuery] = useState('')

  const visible = exercises
    .filter((exercise) => exercise.active)
    .filter((exercise) => exercise.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 12)

  const selectedExercises = selectedIds
    .map((id) => exercises.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is Exercise => Boolean(exercise))

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise)
    setQuery('')
  }

  const content = (
    <>
      {selectedExercises.length > 0 ? (
        <div className="flex flex-col gap-2 mb-3">
          <p className="text-xs font-medium text-muted-foreground">Kolejka ćwiczeń</p>
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
            {selectedExercises.map((exercise, index) => (
              <div key={exercise.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm">
                <span className="w-5 text-xs tabular-nums text-muted-foreground">{index + 1}.</span>
                <span className="min-w-0 flex-1 truncate">{exercise.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => onRemove(exercise.id)}
                  aria-label={`Usuń ${exercise.name} z kolejki`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj ćwiczenia…"
          aria-label="Szukaj ćwiczenia do treningu swobodnego"
          className="h-11 pl-9"
          autoFocus
        />
      </div>
      {query.trim().length > 0 && visible.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 flex-1 overflow-y-auto pr-1">
          {visible.map((exercise) => {
            const selected = selectedIds.includes(exercise.id)
            return (
              <Button
                key={exercise.id}
                type="button"
                variant="outline"
                className="h-auto min-h-11 justify-between whitespace-normal text-left"
                disabled={selected}
                onClick={() => handleSelect(exercise)}
              >
                <span>{exercise.name}</span>
                {selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : <Plus className="size-4 shrink-0" aria-hidden="true" />}
              </Button>
            )
          })}
        </div>
      ) : query.trim().length > 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Nie znaleziono aktywnego ćwiczenia.</p>
        </div>
      ) : null}
    </>
  )

  if (isMobileSheet) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur-xl p-4">
          <CardTitle className="flex items-center gap-2 font-semibold">
            <Plus className="size-4 text-primary" aria-hidden="true" />
            Dodaj ćwiczenie
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {selectedExercises.length} wybrane
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Zamknij"
              className="rounded-xl"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {content}
        </div>
        {/* Footer */}
        <div className="sticky bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur-xl p-4">
          <Button
            type="button"
            className="w-full rounded-xl"
            onClick={onClose}
            disabled={selectedExercises.length === 0}
          >
            Gotowe
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <Plus className="size-4 text-primary" aria-hidden="true" />
          Dodaj ćwiczenie
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {content}
      </CardContent>
    </Card>
  )
}