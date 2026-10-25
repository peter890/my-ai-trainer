import { useState } from 'react'
import { Bot, Check, Coffee, NotebookPen, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatHistoryDate, numberFormat, workoutTypeMeta } from '@/lib/format'
import { formatPace } from '@/lib/cardio'
import type { WorkoutLog } from '@/lib/trainer-data'
import { CardioMetricsForm } from '@/components/trainer/live/cardio-metrics-form'
import { WorkoutSchema, type Workout } from '@/lib/schemas'
import { cn } from '@/lib/utils'

type Props = {
  date: string
  log?: WorkoutLog
  workout?: Workout
  onSave?: (workout: Workout) => Promise<void>
  onDelete?: (workout: Workout) => Promise<void>
}

export function WorkoutDetail({ date, log, workout, onSave, onDelete }: Props) {
  const dateLabel = formatHistoryDate(date)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<Workout | undefined>(workout)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const deleteSelectedWorkout = async () => {
    if (!workout || !onDelete) return
    setIsSaving(true)
    setError('')
    try {
      await onDelete(workout)
      setIsDeleteDialogOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się usunąć treningu.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!log) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Coffee className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold">{dateLabel ? 'Dzień regeneracji' : 'Wybierz dzień'}</p>
            <p className="text-sm text-muted-foreground first-letter:uppercase">
              {dateLabel ?? 'Wybierz dzień w kalendarzu, aby zobaczyć szczegóły.'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const meta = workoutTypeMeta[log.type]

  return (
    <Card className="animate-in fade-in duration-300" key={log.date}>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground first-letter:uppercase">
              {dateLabel ?? 'Data nieznana'} · {log.time}
            </p>
            <h2 className="mt-0.5 text-2xl font-semibold tracking-tight">{log.title}</h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant="outline" className="gap-1.5">
              <span className={cn('size-2 rounded-full', meta.dot)} aria-hidden="true" />
              {meta.label}
            </Badge>
            {workout && onSave && onDelete ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => { setDraft(workout); setError(''); setIsEditing(true) }}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Edytuj
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => { setError(''); setIsDeleteDialogOpen(true) }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Usuń
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {isEditing && draft ? (
          <WorkoutEditor
            workout={draft}
            isSaving={isSaving}
            error={error}
            onChange={setDraft}
            onCancel={() => { setIsEditing(false); setError('') }}
            onSave={async () => {
              const result = WorkoutSchema.safeParse(draft)
              if (!result.success) {
                setError(result.error.issues[0]?.message ?? 'Popraw dane treningu.')
                return
              }
              setIsSaving(true)
              setError('')
              try {
                await onSave?.(result.data)
                setIsEditing(false)
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'Nie udało się zapisać zmian.')
              } finally {
                setIsSaving(false)
              }
            }}
          />
        ) : (
          <>
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Czas" value={`${log.duration} min`} />
          <Stat label="Objętość" value={log.volume > 0 ? `${numberFormat.format(log.volume)} kg` : '—'} />
          <Stat label="Energia" value={`${log.energy}/5`} />
        </dl>

        {log.cardio ? (
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <h3 className="mb-2 text-sm font-semibold">Cardio</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Dystans" value={`${log.cardio.distance_km.toFixed(2)} km`} />
              <Stat label="Śr. prędkość" value={log.cardio.average_speed_kmh === undefined ? '—' : `${log.cardio.average_speed_kmh} km/h`} />
              <Stat label="Śr. tempo" value={formatPace(log.cardio.average_pace_seconds_per_km)} />
              <Stat label="Kalorie" value={log.cardio.calories_kcal === undefined ? '—' : `${log.cardio.calories_kcal} kcal`} />
              <Stat label="Maks. prędkość" value={log.cardio.max_speed_kmh === undefined ? '—' : `${log.cardio.max_speed_kmh} km/h`} />
              <Stat label="Najszybsze tempo" value={formatPace(log.cardio.fastest_pace_seconds_per_km)} />
              <Stat label="Nachylenie" value={log.cardio.max_incline_percent === undefined ? '—' : `${log.cardio.max_incline_percent}% maks.`} />
              <Stat label="Przewyższenie" value={log.cardio.elevation_gain_m === undefined ? '—' : `${log.cardio.elevation_gain_m} m`} />
            </dl>
          </div>
        ) : null}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Ćwiczenia</h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Ćwiczenie
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Serie
                  </th>
                  <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
                    Najlepsza
                  </th>
                </tr>
              </thead>
              <tbody>
                {log.exercises.map((e) => (
                  <tr key={e.name} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      {e.name}
                      <span className="block text-xs text-muted-foreground sm:hidden">{e.best}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">{e.sets}</td>
                    <td className="hidden px-3 py-2.5 font-mono text-xs tabular-nums sm:table-cell">{e.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {log.notes && (
          <div className="flex gap-3 rounded-xl bg-secondary/50 p-3 text-sm">
            <NotebookPen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">{log.notes}</p>
          </div>
        )}

        <div className="rounded-xl border border-primary/25 bg-primary/[0.05] p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <Bot className="size-4" aria-hidden="true" />
            Feedback Trenera AI
          </p>
          <ul className="flex flex-col gap-1.5">
            {log.aiFeedback.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
          </>
        )}
      </CardContent>

      {isDeleteDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) setIsDeleteDialogOpen(false)
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-workout-title"
            aria-describedby="delete-workout-description"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !isSaving) setIsDeleteDialogOpen(false)
            }}
          >
            <h2 id="delete-workout-title" className="text-lg font-semibold">
              Usunąć trening?
            </h2>
            <p id="delete-workout-description" className="mt-2 text-sm text-muted-foreground">
              Ten trening i jego dane zostaną trwale usunięte z historii. Tej operacji nie można cofnąć.
            </p>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                Nie udało się usunąć treningu: {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                autoFocus
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Anuluj
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isSaving}
                onClick={() => void deleteSelectedWorkout()}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {isSaving ? 'Usuwanie…' : 'Usuń trening'}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </Card>
  )
}

function WorkoutEditor({
  workout,
  isSaving,
  error,
  onChange,
  onCancel,
  onSave,
}: {
  workout: Workout
  isSaving: boolean
  error: string
  onChange: (workout: Workout) => void
  onCancel: () => void
  onSave: () => Promise<void>
}) {
  const updateExercise = (exerciseIndex: number, update: Partial<Workout['exercises'][number]>) => {
    onChange({
      ...workout,
      exercises: workout.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, ...update } : exercise),
    })
  }

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight_kg' | 'reps' | 'rir', value: string) => {
    const numericValue = Number(value.replace(',', '.'))
    onChange({
      ...workout,
      exercises: workout.exercises.map((exercise, index) => index === exerciseIndex
        ? {
            ...exercise,
            sets: exercise.sets.map((set, currentSetIndex) => currentSetIndex === setIndex ? { ...set, [field]: numericValue } : set),
          }
        : exercise),
    })
  }

  const addSet = (exerciseIndex: number) => {
    const exercise = workout.exercises[exerciseIndex]
    if (!exercise) return
    updateExercise(exerciseIndex, {
      sets: [...exercise.sets, { set_number: exercise.sets.length + 1, weight_kg: 0, reps: 1, rir: 2 }],
    })
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = workout.exercises[exerciseIndex]
    if (!exercise) return
    updateExercise(exerciseIndex, {
      sets: exercise.sets
        .filter((_, index) => index !== setIndex)
        .map((set, index) => ({ ...set, set_number: index + 1 })),
    })
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-primary/30 bg-primary/[0.03] p-4">
      <div>
        <h3 className="font-semibold">Edytuj trening</h3>
        <p className="mt-1 text-sm text-muted-foreground">Zmiany wpłyną na statystyki i wykresy.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="workout-post-note" className="text-sm font-medium">Notatka po treningu</label>
        <Textarea
          id="workout-post-note"
          value={workout.post_workout_user_notes ?? ''}
          onChange={(event) => onChange({ ...workout, post_workout_user_notes: event.target.value })}
          rows={3}
          placeholder="Dodaj notatkę…"
        />
      </div>
      {workout.exercises.map((exercise, exerciseIndex) => (
        <div key={`${exercise.exercise_id}-${exerciseIndex}`} className="flex flex-col gap-3 rounded-xl border border-border bg-background/50 p-3">
          <div>
            <h4 className="font-medium">{exercise.exercise_name}</h4>
            <Textarea
              value={exercise.note_during_workout}
              onChange={(event) => updateExercise(exerciseIndex, { note_during_workout: event.target.value })}
              rows={2}
              className="mt-2"
              placeholder="Notatka do ćwiczenia…"
              aria-label={`Notatka do ${exercise.exercise_name}`}
            />
          </div>
          {exercise.cardio ? (
            <CardioMetricsForm
              key={`cardio-${exercise.exercise_id}-${exerciseIndex}`}
              value={exercise.cardio}
              onSave={(cardio) => updateExercise(exerciseIndex, { cardio })}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {exercise.sets.map((set, setIndex) => (
                <div key={set.set_number} className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] items-end gap-2">
                  <span className="pb-2 text-center text-xs text-muted-foreground">{setIndex + 1}</span>
                  <label className="text-xs text-muted-foreground">Ciężar
                    <Input type="number" min="0" step="0.1" value={set.weight_kg} onChange={(event) => updateSet(exerciseIndex, setIndex, 'weight_kg', event.target.value)} />
                  </label>
                  <label className="text-xs text-muted-foreground">Powt.
                    <Input type="number" min="1" step="1" value={set.reps} onChange={(event) => updateSet(exerciseIndex, setIndex, 'reps', event.target.value)} />
                  </label>
                  <label className="text-xs text-muted-foreground">RIR
                    <Input type="number" min="0" max="4" step="1" value={set.rir ?? 2} onChange={(event) => updateSet(exerciseIndex, setIndex, 'rir', event.target.value)} />
                  </label>
                  <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => removeSet(exerciseIndex, setIndex)} aria-label={`Usuń serię ${setIndex + 1}`}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => addSet(exerciseIndex)}>
                <Plus className="size-4" aria-hidden="true" />
                Dodaj serię
              </Button>
            </div>
          )}
        </div>
      ))}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={isSaving} onClick={onCancel}>
          <X className="size-4" aria-hidden="true" />
          Anuluj
        </Button>
        <Button type="button" disabled={isSaving} onClick={() => void onSave()}>
          <Check className="size-4" aria-hidden="true" />
          {isSaving ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
