'use client'

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { StrengthProgressPoint } from '@/lib/schemas'

const chartConfig = {
  estimated_1rm_kg: { label: 'Szacowany 1RM', color: 'var(--chart-3)' },
} satisfies ChartConfig

export function StrengthProgressionChart({ data }: { data: StrengthProgressPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-52 w-full md:h-56">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          width={44}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => `${Math.round(value)}`}
          domain={['dataMin - 2', 'dataMax + 2']}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value) => {
                if (typeof value !== 'number') return null
                return <span>{value.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} kg</span>
              }}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="estimated_1rm_kg"
          stroke="var(--color-estimated_1rm_kg)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
