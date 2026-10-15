import { useEffect, useState } from 'react'
import { ChevronRight, TrendingDown } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getProfile } from '@/lib/repositories'
import { WeightChart } from '../weight-chart'

export function WeightTrendCard({ onOpenProfile, className }: { onOpenProfile: () => void; className?: string }) {
  const [weights, setWeights] = useState<{ date: string; weight: number }[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading')

  useEffect(() => {
    let active = true

    void getProfile().then((profile) => {
      if (!active) return

      const nextWeights = (profile?.profile.weight_history ?? []).map((entry) => ({
        date: entry.date.slice(5).replace('-', '.'),
        weight: Number(entry.weight_kg.toFixed(1)),
      }))

      setWeights(nextWeights)
      setStatus(nextWeights.length > 0 ? 'ready' : 'empty')
    })

    return () => {
      active = false
    }
  }, [])

  const current = weights.at(-1)?.weight ?? 0
  const first = weights[0]?.weight ?? 0
  const diff = current - first

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-semibold">Trend wagi</CardTitle>
        <CardDescription>Ostatnie 8 tygodni</CardDescription>
        <CardAction>
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-0.5 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Szczegóły
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {current.toLocaleString('pl-PL')} <span className="text-base font-normal text-muted-foreground">kg</span>
          </p>
          <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <TrendingDown className="size-3.5" aria-hidden="true" />
            {diff.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} kg
          </span>
        </div>
        {status === 'empty' ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Brak pomiarów wagi — dodaj pierwszy pomiar w profilu.
          </p>
        ) : (
          <WeightChart data={weights} compact className="h-28" />
        )}
      </CardContent>
    </Card>
  )
}
