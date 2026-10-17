import { ChevronRight } from 'lucide-react'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WorkoutDashboardStats } from '@/lib/schemas'
import { numberFormat } from '@/lib/format'
import { cn } from '@/lib/utils'

export function WeeklyStatsCard({
  stats,
  onOpenHistory,
  className,
}: {
  stats: WorkoutDashboardStats | null
  onOpenHistory: () => void
  className?: string
}) {
  const values = [
    {
      label: 'Objętość',
      value: stats ? numberFormat.format(Math.round(stats.current_week.volume_kg)) : '—',
      unit: 'kg',
    },
    { label: 'Czas', value: stats ? String(stats.current_week.duration_minutes) : '—', unit: 'min' },
    { label: 'Serie', value: stats ? String(stats.current_week.set_count) : '—', unit: '' },
    { label: 'Treningi', value: stats ? String(stats.current_week.workout_count) : '—', unit: '' },
  ]

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="font-semibold">Ten tydzień</CardTitle>
        <p className="text-xs text-muted-foreground">Tydzień kalendarzowy (poniedziałek–niedziela)</p>
        <CardAction>
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Historia
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3">
          {values.map((item) => (
            <div key={item.label} className="rounded-xl bg-secondary/50 p-3">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="mt-1">
                <span className="text-lg font-semibold tabular-nums">{item.value}</span>
                {item.unit && <span className="ml-1 text-xs text-muted-foreground">{item.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
