'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatPolishCount, workoutTypeMeta } from '@/lib/format'
import type { WorkoutLog, WorkoutType } from '@/lib/trainer-data'
import { cn } from '@/lib/utils'

const weekdays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']

const monthFormatter = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' })

type Props = {
  year: number
  month: number
  logsByDate: Map<string, WorkoutLog[]>
  selected: string
  onSelect: (date: string) => void
  onChangeMonth: (delta: number) => void
}

export function CalendarCard({ year, month, logsByDate, selected, onSelect, onChangeMonth }: Props) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const label = monthFormatter.format(first)
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const count = Array.from(logsByDate.entries())
    .filter(([date]) => date.startsWith(prefix))
    .reduce((total, [, dayLogs]) => total + dayLogs.length, 0)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold capitalize">{label}</h2>
            <p className="text-xs text-muted-foreground">{formatPolishCount(count, 'trening', 'treningi', 'treningów')} w miesiącu</p>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="icon-lg" onClick={() => onChangeMonth(-1)} aria-label="Poprzedni miesiąc">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon-lg" onClick={() => onChangeMonth(1)} aria-label="Następny miesiąc">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={label}>
          {weekdays.map((d) => (
            <div key={d} className="pb-1 text-[11px] font-medium text-muted-foreground" role="columnheader">
              {d}
            </div>
          ))}
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`empty-${i}`} aria-hidden="true" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const date = `${prefix}-${String(day).padStart(2, '0')}`
            const dayLogs = logsByDate.get(date) ?? []
            const log = dayLogs[0]
            const isSelected = date === selected
            const isToday = date === todayKey
            return (
              <button
                key={date}
                type="button"
                role="gridcell"
                onClick={() => onSelect(date)}
                aria-selected={isSelected}
                aria-label={`${day}${dayLogs.length ? `, ${formatPolishCount(dayLogs.length, 'trening', 'treningi', 'treningów')}` : ''}`}
                className={cn(
                  'flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-sm transition-colors',
                  isSelected
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'hover:bg-secondary',
                  !isSelected && isToday && 'ring-1 ring-primary/60',
                  !log && !isSelected && 'text-muted-foreground',
                )}
              >
                <span className="tabular-nums">{day}</span>
                <span
                  className={cn(
                    dayLogs.length > 1
                      ? 'text-[9px] font-semibold leading-none'
                      : 'size-1.5 rounded-full',
                    log ? (isSelected ? 'bg-primary-foreground' : workoutTypeMeta[log.type].dot) : 'bg-transparent',
                  )}
                  aria-hidden="true"
                >
                  {dayLogs.length > 1 ? dayLogs.length : null}
                </span>
              </button>
            )
          })}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3" aria-label="Legenda">
          {(Object.keys(workoutTypeMeta) as WorkoutType[]).map((type) => (
            <li key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('size-2 rounded-full', workoutTypeMeta[type].dot)} aria-hidden="true" />
              {workoutTypeMeta[type].label}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
