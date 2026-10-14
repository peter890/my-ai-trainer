'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { initialExercises, type Exercise } from '@/lib/trainer-data'
import { ExerciseCatalog } from './exercise-catalog'
import { AddExerciseCard } from './add-exercise-card'
import { PlanGenerator } from './plan-generator'

export function ExercisesView() {
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises)

  const toggle = (id: string, key: 'favorite' | 'excluded') =>
    setExercises((list) =>
      list.map((e) => {
        if (e.id !== id) return e
        const next = { ...e, [key]: !e[key] }
        if (key === 'favorite' && next.favorite) next.excluded = false
        if (key === 'excluded' && next.excluded) next.favorite = false
        return next
      }),
    )

  const add = (exercise: Omit<Exercise, 'id' | 'favorite' | 'excluded' | 'custom'>) =>
    setExercises((list) => [
      { ...exercise, id: `custom-${list.length + 1}`, favorite: false, excluded: false, custom: true },
      ...list,
    ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Ćwiczenia i plany</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Oznacz ulubione i wykluczone ćwiczenia — AI uwzględni je przy tworzeniu planu.
        </p>
      </div>

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
            <ExerciseCatalog exercises={exercises} onToggle={toggle} />
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
