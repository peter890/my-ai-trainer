'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { weightHistory, workoutLogs } from '@/lib/trainer-data'
import { WeightChart } from '../weight-chart'
import { CalendarCard } from './calendar-card'
import { WorkoutLogList } from './workout-log-list'
import { WorkoutDetail } from './workout-detail'

export function HistoryView() {
  const [view, setView] = useState({ year: 2026, month: 9 })
  const [selected, setSelected] = useState('2026-10-13')

  const logsByDate = useMemo(() => new Map(workoutLogs.map((l) => [l.date, l])), [])
  const monthPrefix = `${view.year}-${String(view.month + 1).padStart(2, '0')}`
  const monthLogs = workoutLogs.filter((l) => l.date.startsWith(monthPrefix)).reverse()

  const changeMonth = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Kalendarz i historia</h1>
        <p className="mt-1 text-sm text-muted-foreground">Przeglądaj sesje, postępy i analizy Trenera AI.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <CalendarCard
            year={view.year}
            month={view.month}
            logsByDate={logsByDate}
            selected={selected}
            onSelect={setSelected}
            onChangeMonth={changeMonth}
          />
          <WorkoutLogList logs={monthLogs} selected={selected} onSelect={setSelected} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <WorkoutDetail date={selected} log={logsByDate.get(selected)} />
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Postęp wagi</CardTitle>
              <CardDescription>Pomiary tygodniowe (kg)</CardDescription>
            </CardHeader>
            <CardContent>
              <WeightChart data={weightHistory} className="h-56 md:h-64" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
