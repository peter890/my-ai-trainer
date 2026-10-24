'use client'

import { useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CardioMetricsSchema, type CardioMetrics, type CardioSegment } from '@/lib/schemas'
import { formatPace, getCardioSummary } from '@/lib/cardio'

type Props = {
  value?: CardioMetrics
  bodyWeightKg?: number
  onSave: (value: CardioMetrics) => void
}

type SegmentDraft = {
  phase: CardioSegment['phase']
  duration: string
  distance: string
  speed: string
  incline: string
}

type Draft = {
  duration: string
  distance: string
  calories: string
  averageIncline: string
  maxIncline: string
  elevationGain: string
  profile: string
  segments: SegmentDraft[]
}

const phaseLabels: Record<NonNullable<CardioSegment['phase']>, string> = {
  warmup: 'Rozgrzewka',
  main: 'Część główna',
  cooldown: 'Schłodzenie',
  interval: 'Interwał',
}

const numberToString = (value?: number) => value === undefined ? '' : String(value)
const parseOptionalNumber = (value: string) => value.trim() === '' ? undefined : Number(value.replace(',', '.'))

function createDraft(value?: CardioMetrics): Draft {
  return {
    duration: numberToString(value?.duration_minutes),
    distance: numberToString(value?.distance_km),
    calories: numberToString(value?.calories_kcal),
    averageIncline: numberToString(value?.average_incline_percent),
    maxIncline: numberToString(value?.max_incline_percent),
    elevationGain: numberToString(value?.elevation_gain_m),
    profile: value?.workout_profile ?? '',
    segments: (value?.segments ?? []).map((segment) => ({
      phase: segment.phase ?? 'main',
      duration: String(segment.duration_minutes),
      distance: numberToString(segment.distance_km),
      speed: numberToString(segment.speed_kmh),
      incline: numberToString(segment.incline_percent),
    })),
  }
}

export function CardioMetricsForm({ value, bodyWeightKg, onSave }: Props) {
  const [draft, setDraft] = useState(() => createDraft(value))
  const [error, setError] = useState('')

  const updateSegment = (index: number, update: Partial<SegmentDraft>) => {
    setDraft((current) => ({
      ...current,
      segments: current.segments.map((segment, segmentIndex) =>
        segmentIndex === index ? { ...segment, ...update } : segment,
      ),
    }))
  }

  const save = () => {
    const metrics = {
      duration_minutes: parseOptionalNumber(draft.duration),
      distance_km: parseOptionalNumber(draft.distance),
      calories_kcal: parseOptionalNumber(draft.calories),
      average_incline_percent: parseOptionalNumber(draft.averageIncline),
      max_incline_percent: parseOptionalNumber(draft.maxIncline),
      elevation_gain_m: parseOptionalNumber(draft.elevationGain),
      workout_profile: draft.profile.trim() || undefined,
      segments: draft.segments.map((segment) => ({
        phase: segment.phase,
        duration_minutes: parseOptionalNumber(segment.duration),
        distance_km: parseOptionalNumber(segment.distance),
        speed_kmh: parseOptionalNumber(segment.speed),
        incline_percent: parseOptionalNumber(segment.incline),
      })),
    }
    const result = CardioMetricsSchema.safeParse(metrics)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Uzupełnij poprawnie dane cardio.')
      return
    }
    setError('')
    onSave(result.data)
  }

  const summary = value ? getCardioSummary(value, bodyWeightKg) : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Parametry cardio</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cardio-duration">Czas (min)</Label>
            <Input id="cardio-duration" inputMode="decimal" value={draft.duration} onChange={(event) => setDraft({ ...draft, duration: event.target.value })} placeholder="np. 35" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cardio-distance">Dystans (km)</Label>
            <Input id="cardio-distance" inputMode="decimal" value={draft.distance} onChange={(event) => setDraft({ ...draft, distance: event.target.value })} placeholder="np. 5,2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cardio-profile">Program</Label>
            <Input id="cardio-profile" value={draft.profile} onChange={(event) => setDraft({ ...draft, profile: event.target.value })} placeholder="Manual, HIIT, Hill Climb…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cardio-calories">Kalorie (kcal)</Label>
            <Input id="cardio-calories" inputMode="decimal" value={draft.calories} onChange={(event) => setDraft({ ...draft, calories: event.target.value })} placeholder="Puste = szacowanie" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cardio-average-incline">Śr. nachylenie (%)</Label>
            <Input id="cardio-average-incline" inputMode="decimal" value={draft.averageIncline} onChange={(event) => setDraft({ ...draft, averageIncline: event.target.value })} placeholder="np. 3" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cardio-max-incline">Maks. nachylenie (%)</Label>
            <Input id="cardio-max-incline" inputMode="decimal" value={draft.maxIncline} onChange={(event) => setDraft({ ...draft, maxIncline: event.target.value })} placeholder="np. 8" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cardio-elevation">Przewyższenie (m)</Label>
            <Input id="cardio-elevation" inputMode="decimal" value={draft.elevationGain} onChange={(event) => setDraft({ ...draft, elevationGain: event.target.value })} placeholder="Puste = wylicz" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Odcinki treningu</h3>
              <p className="text-xs text-muted-foreground">Dodaj je, aby policzyć maksymalną prędkość i tempo.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraft((current) => ({
                ...current,
                segments: [...current.segments, { phase: 'main', duration: '1', distance: '', speed: '', incline: '' }],
              }))}
            >
              <Plus className="size-4" aria-hidden="true" />
              Odcinek
            </Button>
          </div>
          {draft.segments.map((segment, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-border bg-secondary/30 p-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))_auto]">
              <div className="space-y-1.5">
                <Label>Faza</Label>
                <Select value={segment.phase ?? 'main'} onValueChange={(phase) => updateSegment(index, { phase: phase as SegmentDraft['phase'] })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(phaseLabels).map(([phase, label]) => <SelectItem key={phase} value={phase}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Czas (min)</Label>
                <Input inputMode="decimal" value={segment.duration} onChange={(event) => updateSegment(index, { duration: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Dystans (km)</Label>
                <Input inputMode="decimal" value={segment.distance} onChange={(event) => updateSegment(index, { distance: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Prędkość (km/h)</Label>
                <Input inputMode="decimal" value={segment.speed} onChange={(event) => updateSegment(index, { speed: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Nachylenie (%)</Label>
                <Input inputMode="decimal" value={segment.incline} onChange={(event) => updateSegment(index, { incline: event.target.value })} />
              </div>
              <Button type="button" variant="ghost" size="icon" className="self-end" onClick={() => setDraft((current) => ({ ...current, segments: current.segments.filter((_, segmentIndex) => segmentIndex !== index) }))} aria-label="Usuń odcinek">
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>

        {summary ? (
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/30 p-3 text-sm sm:grid-cols-4">
            <span>Śr. prędkość: <strong>{summary.averageSpeedKmh ?? '—'} km/h</strong></span>
            <span>Maks. prędkość: <strong>{summary.maxSpeedKmh ?? '—'} km/h</strong></span>
            <span>Śr. tempo: <strong>{formatPace(summary.averagePaceSecondsPerKm)}</strong></span>
            <span>Najszybsze tempo: <strong>{formatPace(summary.fastestPaceSecondsPerKm)}</strong></span>
            <span>Kalorie: <strong>{summary.caloriesKcal ?? '—'} kcal</strong></span>
            <span>Przewyższenie: <strong>{summary.elevationGainM ?? '—'} m</strong></span>
          </div>
        ) : null}

        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" onClick={save} className="w-full sm:w-fit">
          <Save className="size-4" aria-hidden="true" />
          Zapisz parametry cardio
        </Button>
      </CardContent>
    </Card>
  )
}
