'use client'

import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Exercise, ExercisePreferences } from '@/lib/schemas'
import { createExerciseRecord, initializeExerciseCatalog, toExerciseView } from '@/lib/exercise-catalog'
import { saveExercise, saveExercisePreferences } from '@/lib/repositories'
import type { ExerciseDraft } from '@/lib/exercise-catalog'
import { ExerciseCatalog } from './exercise-catalog'
import { AddExerciseCard } from './add-exercise-card'
import { PlanGenerator } from './plan-generator'

export function ExercisesView() {
  const [records, setRecords] = useState<Exercise[]>([])
  const [preferences, setPreferences] = useState<ExercisePreferences>({
    excluded_exercise_ids: [],
    favorite_exercise_ids: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCatalog = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await initializeExerciseCatalog()
      setRecords(result.exercises)
      setPreferences(result.preferences)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się wczytać katalogu ćwiczeń.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    initializeExerciseCatalog()
      .then((result) => {
        if (cancelled) return
        setRecords(result.exercises)
        setPreferences(result.preferences)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : 'Nie udało się wczytać katalogu ćwiczeń.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const exercises = useMemo(
    () => records.map((exercise) => toExerciseView(exercise, preferences)),
    [records, preferences],
  )

  const toggle = async (id: string, key: 'favorite' | 'excluded') => {
    const currentIds =
      key === 'favorite' ? preferences.favorite_exercise_ids : preferences.excluded_exercise_ids
    const enabling = !currentIds.includes(id)
    const nextPreferences: ExercisePreferences = {
      favorite_exercise_ids: preferences.favorite_exercise_ids.filter(
        (exerciseId) => exerciseId !== id,
      ),
      excluded_exercise_ids: preferences.excluded_exercise_ids.filter(
        (exerciseId) => exerciseId !== id,
      ),
    }
    const target =
      key === 'favorite'
        ? nextPreferences.favorite_exercise_ids
        : nextPreferences.excluded_exercise_ids
    if (enabling) target.push(id)

    try {
      await saveExercisePreferences(nextPreferences)
      setPreferences(nextPreferences)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się zapisać preferencji.')
    }
  }

  const toggleActive = async (id: string) => {
    const exercise = records.find((record) => record.id === id)
    if (!exercise) return
    const updatedExercise = { ...exercise, active: !exercise.active }

    try {
      const savedExercise = await saveExercise(updatedExercise)
      setRecords((current) =>
        current.map((record) => (record.id === id ? savedExercise : record)),
      )
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się zmienić aktywności ćwiczenia.')
    }
  }

  const updateTechniqueNote = async (id: string, techniqueNote: string): Promise<boolean> => {
    const exercise = records.find((record) => record.id === id)
    if (!exercise) return false

    try {
      const savedExercise = await saveExercise({ ...exercise, technique_note: techniqueNote })
      setRecords((current) =>
        current.map((record) => (record.id === id ? savedExercise : record)),
      )
      setError('')
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się zapisać notatki technicznej.')
      return false
    }
  }

  const add = async (draft: Omit<ExerciseDraft, 'id'>) => {
    try {
      const record = createExerciseRecord({
        ...draft,
        id: `custom-${crypto.randomUUID()}`,
      })
      const savedExercise = await saveExercise(record)
      setRecords((current) => [savedExercise, ...current])
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się dodać ćwiczenia.')
    }
  }

  if (loading) {
    return <p role="status" className="py-12 text-center text-sm text-muted-foreground">Wczytywanie katalogu ćwiczeń…</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Ćwiczenia i plany</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Oznacz ulubione i wykluczone ćwiczenia — AI uwzględni je przy tworzeniu planu.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <button type="button" onClick={() => void loadCatalog()} className="shrink-0 underline">
            Spróbuj ponownie
          </button>
        </div>
      )}

      <Tabs defaultValue="catalog" className="gap-4">
        <TabsList className="h-11 w-full sm:w-fit">
          <TabsTrigger value="catalog" className="px-4">
            Katalog ćwiczeń
          </TabsTrigger>
          <TabsTrigger value="generator" className="px-4">
            Generator planu AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
            <ExerciseCatalog
              exercises={exercises}
              onToggle={(id, key) => void toggle(id, key)}
              onToggleActive={(id) => void toggleActive(id)}
              onSaveTechniqueNote={updateTechniqueNote}
            />
            <AddExerciseCard onAdd={add} />
          </div>
        </TabsContent>

        <TabsContent value="generator">
          <PlanGenerator exercises={exercises} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
