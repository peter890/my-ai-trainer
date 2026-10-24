'use client'

import { useEffect, useState } from 'react'
import { Clock, Dumbbell, Play, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getExercises, getPlans } from '@/lib/repositories'
import type { WorkoutPlan } from '@/lib/schemas'
import type { Exercise as ExerciseRecord } from '@/lib/schemas'
import { getWorkoutPlanCatalogError } from '@/lib/live-session'
import { cn } from '@/lib/utils'

export function QuickStartCard({
  liveActive,
  onStart,
  className,
}: {
  liveActive: boolean
  onStart: (planId: string) => void
  className?: string
}) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [exercises, setExercises] = useState<ExerciseRecord[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [error, setError] = useState('')

  const loadPlans = async () => {
    setStatus('loading')
    setError('')
    try {
      const [savedPlans, catalog] = await Promise.all([getPlans(), getExercises()])
      setPlans(savedPlans)
      setExercises(catalog)
      setSelectedPlanId((current) =>
        savedPlans.some((plan) => plan.id === current) ? current : savedPlans[0]?.id ?? '',
      )
      setStatus(savedPlans.length > 0 ? 'ready' : 'empty')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się wczytać zapisanych planów.')
      setStatus('error')
    }
  }

  useEffect(() => {
    let active = true
    void Promise.all([getPlans(), getExercises()])
      .then(([savedPlans, catalog]) => {
        if (!active) return
        setPlans(savedPlans)
        setExercises(catalog)
        setSelectedPlanId(savedPlans[0]?.id ?? '')
        setStatus(savedPlans.length > 0 ? 'ready' : 'empty')
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'Nie udało się wczytać zapisanych planów.')
        setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId)
  const exerciseCount = selectedPlan?.exercises.length ?? 0
  const planError = selectedPlan ? getWorkoutPlanCatalogError(selectedPlan, exercises) : undefined

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <CardContent className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {status === 'loading'
              ? 'Wczytywanie planów'
              : status === 'empty'
                ? 'Brak planu'
                : status === 'error'
                  ? 'Błąd planów'
                  : 'Wybierz trening'}
          </span>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">{status === 'empty' ? 'Brak planu' : selectedPlan?.name ?? 'Trening'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {status === 'empty'
                ? 'Utwórz i zapisz plan treningowy, aby rozpocząć sesję.'
                : status === 'error'
                  ? error
                  : planError
                    ? planError
                  : `${selectedPlan?.type ?? ''} · wybierz plan do rozpoczęcia`}
            </p>
          </div>
          {plans.length > 1 ? (
            <label className="flex flex-col gap-2 text-sm">
              Wybierz zapisany plan
              <Select
                value={selectedPlanId}
                onValueChange={(value) => {
                  if (value) setSelectedPlanId(value)
                }}
              >
                <SelectTrigger className="h-11 w-full bg-background">
                  <SelectValue>{selectedPlan?.name}</SelectValue>
                </SelectTrigger>
                <SelectContent align="start">
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Dumbbell className="size-4" aria-hidden="true" />
              {status === 'empty' || status === 'error' ? 0 : exerciseCount} ćwiczeń
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              {status === 'empty' || status === 'error' ? '—' : `ok. ${Math.max(30, exerciseCount * 12)} min`}
            </span>
          </div>
          {status === 'error' ? (
            <button
              type="button"
              onClick={() => void loadPlans()}
              className="w-fit text-sm underline underline-offset-2"
            >
              Ponów wczytywanie planów
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            if (selectedPlan) onStart(selectedPlan.id)
          }}
          disabled={status !== 'ready' || !selectedPlan || Boolean(planError)}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none md:w-auto"
        >
          <Play className="size-5 fill-current" aria-hidden="true" />
          {status === 'loading'
            ? 'Wczytywanie…'
            : liveActive
              ? 'Wróć do treningu'
              : status === 'empty'
                ? 'Brak planu'
                : status === 'error'
                  ? 'Nie można wczytać planów'
                  : planError
                    ? 'Plan wymaga poprawy'
                  : 'Rozpocznij trening'}
        </button>
      </CardContent>
    </Card>
  )
}
