'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getPlans, savePlan, deletePlan } from '@/lib/repositories'
import { WorkoutPlanSchema, type WorkoutPlan } from '@/lib/schemas'
import type { Exercise } from '@/lib/trainer-data'

export function SavedPlans({
  exercises,
  refreshKey,
}: {
  exercises: Exercise[]
  refreshKey: number
}) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState('')

  const loadPlans = async () => {
    setLoading(true)
    setError('')
    try {
      setPlans(await getPlans())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się wczytać zapisanych planów.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void getPlans()
      .then((savedPlans) => {
        if (active) setPlans(savedPlans)
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Nie udało się wczytać zapisanych planów.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [refreshKey])

  const updatePlan = (planId: string, update: (plan: WorkoutPlan) => WorkoutPlan) => {
    setPlans((current) => current.map((plan) => (plan.id === planId ? update(plan) : plan)))
  }

  const saveEditedPlan = async (plan: WorkoutPlan) => {
    setSavingId(plan.id)
    setError('')
    try {
      const validatedPlan = WorkoutPlanSchema.parse({
        ...plan,
        updated_at: new Date().toISOString(),
      })
      await savePlan(validatedPlan)
      setPlans((current) => current.map((item) => (item.id === plan.id ? validatedPlan : item)))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się zapisać planu.')
    } finally {
      setSavingId('')
    }
  }

  const removePlan = async (planId: string) => {
    setError('')
    try {
      await deletePlan(planId)
      setPlans((current) => current.filter((plan) => plan.id !== planId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się usunąć planu.')
    }
  }

  const activeExercises = exercises.filter((exercise) => exercise.active)

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="font-semibold">Zapisane plany</CardTitle>
        <CardDescription>Edytuj nazwę i ćwiczenia w planie; zmiany są zapisywane lokalnie.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading ? <p role="status" className="text-sm text-muted-foreground">Wczytywanie planów…</p> : null}
        {!loading && plans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            Nie ma jeszcze zapisanych planów. Wygeneruj i zapisz plan tygodniowy.
          </p>
        ) : null}
        {error ? (
          <div role="alert" className="flex items-center justify-between gap-3 text-sm text-destructive">
            <span>{error}</span>
            <button type="button" onClick={() => void loadPlans()} className="shrink-0 underline">
              Spróbuj ponownie
            </button>
          </div>
        ) : null}

        {plans.map((plan) => (
          <article key={plan.id} className="rounded-xl border border-border bg-secondary/20 p-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Input
                  value={plan.name}
                  maxLength={120}
                  aria-label={`Nazwa planu ${plan.name}`}
                  onChange={(event) =>
                    updatePlan(plan.id, (current) => ({ ...current, name: event.target.value }))
                  }
                  className="h-10 font-medium"
                />
                <button
                  type="button"
                  onClick={() => void saveEditedPlan(plan)}
                  disabled={savingId === plan.id}
                  aria-label={`Zapisz plan ${plan.name}`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-60"
                >
                  <Save className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void removePlan(plan.id)}
                  aria-label={`Usuń plan ${plan.name}`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>

              <ol className="flex flex-col gap-2">
                {plan.exercises.map((planExercise, index) => {
                  const currentExercise = exercises.find(({ id }) => id === planExercise.exercise_id)
                  const options = activeExercises.some(({ id }) => id === planExercise.exercise_id)
                    ? activeExercises
                    : [...activeExercises, ...(currentExercise ? [currentExercise] : [])]
                  return (
                    <li key={`${plan.id}-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_6rem_2.5rem]">
                      <label className="sr-only" htmlFor={`${plan.id}-exercise-${index}`}>
                        Ćwiczenie {index + 1} w planie {plan.name}
                      </label>
                      <Select
                        value={planExercise.exercise_id}
                        onValueChange={(value) => {
                          const selected = activeExercises.find(({ id }) => id === value)
                          if (!selected) return
                          updatePlan(plan.id, (current) => ({
                            ...current,
                            exercises: current.exercises.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, exercise_id: selected.id, rest_type: selected.restType }
                                : item,
                            ),
                          }))
                        }}
                      >
                        <SelectTrigger
                          id={`${plan.id}-exercise-${index}`}
                          className="h-10 w-full min-w-0 bg-background px-2 text-sm"
                        >
                          <SelectValue>{currentExercise?.name ?? 'Wybierz ćwiczenie'}</SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start">
                          {options.map((exercise) => (
                            <SelectItem key={exercise.id} value={exercise.id}>
                              {exercise.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={planExercise.target_sets}
                        aria-label={`Liczba serii ćwiczenia ${index + 1}`}
                        onChange={(event) => {
                          const targetSets = Number(event.target.value)
                          updatePlan(plan.id, (current) => ({
                            ...current,
                            exercises: current.exercises.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, target_sets: targetSets } : item,
                            ),
                          }))
                        }}
                      />
                      <Input
                        value={planExercise.target_reps}
                        maxLength={30}
                        aria-label={`Zakres powtórzeń ćwiczenia ${index + 1}`}
                        onChange={(event) =>
                          updatePlan(plan.id, (current) => ({
                            ...current,
                            exercises: current.exercises.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, target_reps: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                      <button
                        type="button"
                        disabled={plan.exercises.length <= 1}
                        onClick={() =>
                          updatePlan(plan.id, (current) => ({
                            ...current,
                            exercises: current.exercises
                              .filter((_, itemIndex) => itemIndex !== index)
                              .map((item, itemIndex) => ({ ...item, order: itemIndex })),
                          }))
                        }
                        aria-label={`Usuń ćwiczenie ${index + 1} z planu ${plan.name}`}
                        className="flex size-10 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-40"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ol>

              <button
                type="button"
                disabled={activeExercises.length === 0}
                onClick={() => {
                  const addedExercise = activeExercises.find(
                    (exercise) => !plan.exercises.some(({ exercise_id }) => exercise_id === exercise.id),
                  )
                  if (!addedExercise) return
                  updatePlan(plan.id, (current) => ({
                    ...current,
                    exercises: [
                      ...current.exercises,
                      {
                        exercise_id: addedExercise.id,
                        order: current.exercises.length,
                        target_sets: 3,
                        target_reps: '8-12',
                        rest_type: addedExercise.restType,
                      },
                    ],
                  }))
                }}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                <Plus className="size-4" aria-hidden="true" />
                Dodaj ćwiczenie
              </button>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  )
}
