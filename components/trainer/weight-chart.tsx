'use client'

import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'

const chartConfig = {
  weight: { label: 'Waga (kg)', color: 'var(--chart-1)' },
} satisfies ChartConfig

type Props = {
  data: { date: string; weight: number }[]
  compact?: boolean
  className?: string
}

export function WeightChart({ data, compact = false, className }: Props) {
  const gradientId = `weight-fill-${useId().replace(/:/g, '')}`

  return (
    <ChartContainer config={chartConfig} className={cn('aspect-auto h-56 w-full', className)}>
      <AreaChart data={data} margin={{ left: compact ? 0 : -12, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-weight)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-weight)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {!compact && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} hide={compact} />
        <YAxis
          domain={['dataMin - 0.5', 'dataMax + 0.5']}
          tickLine={false}
          axisLine={false}
          width={44}
          hide={compact}
          tickFormatter={(v: number) => v.toFixed(0)}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Area
          dataKey="weight"
          type="monotone"
          stroke="var(--color-weight)"
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
