import { Bot, Coffee, NotebookPen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatHistoryDate, numberFormat, workoutTypeMeta } from '@/lib/format'
import type { WorkoutLog } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'

export function WorkoutDetail({ date, log }: { date: string; log?: WorkoutLog }) {
  const dateLabel = formatHistoryDate(date)

  if (!log) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Coffee className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold">{dateLabel ? 'Dzień regeneracji' : 'Wybierz dzień'}</p>
            <p className="text-sm text-muted-foreground first-letter:uppercase">
              {dateLabel ?? 'Wybierz dzień w kalendarzu, aby zobaczyć szczegóły.'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const meta = workoutTypeMeta[log.type]

  return (
    <Card className="animate-in fade-in duration-300" key={log.date}>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground first-letter:uppercase">{dateLabel ?? 'Data nieznana'}</p>
            <h2 className="mt-0.5 text-2xl font-semibold tracking-tight">{log.title}</h2>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <span className={cn('size-2 rounded-full', meta.dot)} aria-hidden="true" />
            {meta.label}
          </Badge>
        </div>

        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Czas" value={`${log.duration} min`} />
          <Stat label="Objętość" value={log.volume > 0 ? `${numberFormat.format(log.volume)} kg` : '—'} />
          <Stat label="Energia" value={`${log.energy}/5`} />
        </dl>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Ćwiczenia</h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Ćwiczenie
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Serie
                  </th>
                  <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
                    Najlepsza
                  </th>
                </tr>
              </thead>
              <tbody>
                {log.exercises.map((e) => (
                  <tr key={e.name} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      {e.name}
                      <span className="block text-xs text-muted-foreground sm:hidden">{e.best}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">{e.sets}</td>
                    <td className="hidden px-3 py-2.5 font-mono text-xs tabular-nums sm:table-cell">{e.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {log.notes && (
          <div className="flex gap-3 rounded-xl bg-secondary/50 p-3 text-sm">
            <NotebookPen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">{log.notes}</p>
          </div>
        )}

        <div className="rounded-xl border border-primary/25 bg-primary/[0.05] p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <Bot className="size-4" aria-hidden="true" />
            Feedback Trenera AI
          </p>
          <ul className="flex flex-col gap-1.5">
            {log.aiFeedback.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
