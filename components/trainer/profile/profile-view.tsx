'use client'

import { useState } from 'react'
import { weightHistory } from '@/lib/trainer-data'
import { BiometricsCard } from './biometrics-card'
import { WeightHistoryCard } from './weight-history-card'
import { GeminiCard } from './gemini-card'
import { DriveSyncCard } from './drive-sync-card'

export function ProfileView() {
  const [weights, setWeights] = useState(weightHistory)
  const currentWeight = weights.at(-1)!.weight

  const addWeight = (weight: number) =>
    setWeights((list) => [...list, { date: 'Dziś', weight }].slice(-12))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Profil i ustawienia</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dane biometryczne, integracja z Gemini i synchronizacja.</p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col gap-4">
          <BiometricsCard weight={currentWeight} />
          <GeminiCard />
        </div>
        <div className="flex flex-col gap-4">
          <WeightHistoryCard weights={weights} onAdd={addWeight} />
          <DriveSyncCard />
        </div>
      </div>
    </div>
  )
}
