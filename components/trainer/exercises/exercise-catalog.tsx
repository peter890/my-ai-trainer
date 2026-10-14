'use client'

import { useState } from 'react'
import { Ban, Search, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { muscleGroups, type Exercise, type MuscleGroup } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'favorite' | 'excluded'

type Props = {
  exercises: Exercise[]
  onToggle: (id: string, key: 'favorite' | 'excluded') => void
}

export function ExerciseCatalog({ exercises, onToggle }: Props) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all')
  const [filter, setFilter] = useState<Filter>('all')

  const visible = exercises.filter(
    (e) =>
      (muscle === 'all' || e.muscle === muscle) &&
      (filter === 'all' || e[filter]) &&
      e.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const counts = {
    all: exercises.length,
    favorite: exercises.filter((e) => e.favorite).length,
    excluded: exercises.filter((e) => e.excluded).length,
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Wszystkie' },
    { id: 'favorite', label: 'Ulubione' },
    { id: 'excluded', label: 'Wykluczone' },
  ]

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj ćwiczenia…"
            aria-label="Szukaj ćwiczenia"
            className="h-11 pl-9"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-1 rounded-xl bg-secondary/60 p-1" role="group" aria-label="Filtr statusu">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors',
                  filter === f.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
                <span className="text-xs tabular-nums text-muted-foreground">{counts[f.id]}</span>
              </button>
            ))}
          </div>

          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Partia mięśniowa">
            {(['all', ...muscleGroups] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMuscle(m)}
                aria-pressed={muscle === m}
                className={cn(
                  'h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors',
                  muscle === m
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'all' ? 'Wszystkie partie' : m}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Brak ćwiczeń spełniających kryteria.
          </p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {visible.map((e) => (
              <li
                key={e.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3 transition-colors',
                  e.excluded && 'opacity-55',
                  e.favorite && 'border-primary/30',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm font-medium', e.excluded && 'line-through')}>{e.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {e.muscle} · {e.equipment}
                    {e.custom && (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                        Własne
                      </Badge>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggle(e.id, 'favorite')}
                  aria-pressed={e.favorite}
                  aria-label={`${e.favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}: ${e.name}`}
                  className={cn(
                    'flex size-10 items-center justify-center rounded-lg transition-colors',
                    e.favorite ? 'text-warning' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Star className={cn('size-5', e.favorite && 'fill-current')} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggle(e.id, 'excluded')}
                  aria-pressed={e.excluded}
                  aria-label={`${e.excluded ? 'Przywróć' : 'Wyklucz'}: ${e.name}`}
                  className={cn(
                    'flex size-10 items-center justify-center rounded-lg transition-colors',
                    e.excluded
                      ? 'bg-destructive/15 text-destructive'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Ban className="size-5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
