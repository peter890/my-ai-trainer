'use client'

import { useState } from 'react'
import { Ban, Check, CircleCheck, CircleX, Pencil, Search, Star, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { filterExercisesByEquipment } from '@/lib/exercise-catalog'
import { muscleGroups, type Exercise, type MuscleGroup } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'active' | 'inactive' | 'favorite' | 'excluded'
type EquipmentFilter = 'all' | Exercise['equipment']

const equipmentOptions: Exercise['equipment'][] = [
  'Sztanga',
  'Hantle',
  'Wyciąg',
  'Maszyna',
  'Kalistenika',
  'Kardio',
  'Bieżnia',
]

type Props = {
  exercises: Exercise[]
  onToggle: (id: string, key: 'favorite' | 'excluded') => void
  onToggleActive: (id: string) => void
  onSaveTechniqueNote: (id: string, note: string) => Promise<boolean>
}

export function ExerciseCatalog({
  exercises,
  onToggle,
  onToggleActive,
  onSaveTechniqueNote,
}: Props) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all')
  const [filter, setFilter] = useState<Filter>('all')
  const [equipment, setEquipment] = useState<EquipmentFilter>('all')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const visible = filterExercisesByEquipment(exercises, equipment).filter(
    (e) =>
      (muscle === 'all' || e.muscle === muscle) &&
      (filter === 'all' ||
        (filter === 'active' && e.active) ||
        (filter === 'inactive' && !e.active) ||
        (filter === 'favorite' && e.favorite) ||
        (filter === 'excluded' && e.excluded)) &&
      e.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const counts = {
    all: exercises.length,
    active: exercises.filter((e) => e.active).length,
    inactive: exercises.filter((e) => !e.active).length,
    favorite: exercises.filter((e) => e.favorite).length,
    excluded: exercises.filter((e) => e.excluded).length,
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Wszystkie' },
    { id: 'active', label: 'Aktywne' },
    { id: 'inactive', label: 'Nieaktywne' },
    { id: 'favorite', label: 'Ulubione' },
    { id: 'excluded', label: 'Wykluczone' },
  ]

  const saveNote = async () => {
    if (!editingNoteId) return
    setSavingNote(true)
    const saved = await onSaveTechniqueNote(editingNoteId, noteDraft)
    setSavingNote(false)
    if (saved) setEditingNoteId(null)
  }

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
          <div className="-mx-1 flex gap-1 overflow-x-auto rounded-xl bg-secondary/60 p-1" role="group" aria-label="Filtr statusu">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  'flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
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

          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Sprzęt">
            {(['all', ...equipmentOptions] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setEquipment(option)}
                aria-pressed={equipment === option}
                className={cn(
                  'h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors',
                  equipment === option
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {option === 'all' ? 'Każdy sprzęt' : option}
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
                  'flex flex-col gap-1.5 rounded-xl border border-border bg-secondary/30 p-3 transition-colors',
                  e.excluded && 'opacity-55',
                  !e.active && 'opacity-50',
                  e.favorite && 'border-primary/30',
                )}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'whitespace-normal break-words text-sm font-medium [overflow-wrap:anywhere]',
                        (e.excluded || !e.active) && 'line-through',
                      )}
                    >
                      {e.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {e.muscle} · {e.equipment}
                      {e.custom && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                          Własne
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-end">
                    <button
                      type="button"
                      onClick={() => onToggleActive(e.id)}
                      aria-pressed={e.active}
                      aria-label={`${e.active ? 'Dezaktywuj' : 'Aktywuj'} ćwiczenie: ${e.name}`}
                      className={cn(
                        'flex size-10 items-center justify-center rounded-lg transition-colors',
                        e.active ? 'text-emerald-400 hover:bg-secondary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                      )}
                    >
                      {e.active ? (
                        <CircleCheck className="size-5" aria-hidden="true" />
                      ) : (
                        <CircleX className="size-5" aria-hidden="true" />
                      )}
                    </button>
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
                          : 'text-destructive/70 hover:bg-destructive/10 hover:text-destructive',
                      )}
                    >
                      <Ban className="size-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNoteId(e.id)
                        setNoteDraft(e.techniqueNote)
                      }}
                      aria-label={`Edytuj notatkę techniczną: ${e.name}`}
                      className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {editingNoteId === e.id ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      maxLength={2000}
                      aria-label={`Notatka techniczna: ${e.name}`}
                      placeholder="Dodaj wskazówki techniczne"
                      className="min-h-20 text-sm"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{noteDraft.length}/2000</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          disabled={savingNote}
                          aria-label="Anuluj edycję notatki"
                          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveNote()}
                          disabled={savingNote}
                          aria-label="Zapisz notatkę techniczną"
                          className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-60"
                        >
                          <Check className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : e.techniqueNote ? (
                  <p className="max-w-full whitespace-pre-wrap break-words border-t border-border/70 pt-2 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {e.techniqueNote}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
