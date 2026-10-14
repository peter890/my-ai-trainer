import { ChevronRight } from 'lucide-react'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const stats = [
  { label: 'Objętość', value: '12 550', unit: 'kg', change: '+4%' },
  { label: 'Czas', value: '3 h 02', unit: 'min', change: '+12 min' },
  { label: 'Serie', value: '58', unit: '', change: '+3' },
  { label: 'Rekordy', value: '2', unit: 'PR', change: 'nowe' },
]

export function WeeklyStatsCard({ onOpenHistory, className }: { onOpenHistory: () => void; className?: string }) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="font-semibold">Ten tydzień</CardTitle>
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
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-secondary/50 p-3">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="mt-1">
                <span className="text-lg font-semibold tabular-nums">{s.value}</span>
                {s.unit && <span className="ml-1 text-xs text-muted-foreground">{s.unit}</span>}
                <span className="block text-xs text-primary">{s.change}</span>
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
