import { ChevronRight, TrendingDown } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { weightHistory } from '@/lib/trainer-data'
import { WeightChart } from '../weight-chart'

export function WeightTrendCard({ onOpenProfile, className }: { onOpenProfile: () => void; className?: string }) {
  const current = weightHistory.at(-1)!.weight
  const first = weightHistory[0].weight
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
        <WeightChart data={weightHistory} compact className="h-28" />
      </CardContent>
    </Card>
  )
}
