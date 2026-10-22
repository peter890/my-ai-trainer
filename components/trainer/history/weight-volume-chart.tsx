'use client'

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { WeightVolumePoint } from '@/lib/schemas'
import { numberFormat } from '@/lib/format'

const chartConfig = {
  weight_kg: { label: 'Waga', color: 'var(--chart-1)' },
  volume_kg: { label: 'Tonaż', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function WeightVolumeChart({ data }: { data: WeightVolumePoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full md:h-64">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          yAxisId="weight"
          orientation="left"
          width={44}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => `${Math.round(value)}`}
          domain={['dataMin - 1', 'dataMax + 1']}
        />
        <YAxis
          yAxisId="volume"
          orientation="right"
          width={48}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
          domain={[0, 'dataMax + 250']}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value, name) => {
                if (typeof value !== 'number') return null
                if (name === 'weight_kg') return <span>{value.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} kg</span>
                return <span>{numberFormat.format(Math.round(value))} kg</span>
              }}
            />
          }
        />
        <Line
          yAxisId="weight"
          type="monotone"
          dataKey="weight_kg"
          stroke="var(--color-weight_kg)"
          strokeWidth={2.5}
          dot={false}
          connectNulls
          activeDot={{ r: 4 }}
        />
        <Line
          yAxisId="volume"
          type="monotone"
          dataKey="volume_kg"
          stroke="var(--color-volume_kg)"
          strokeWidth={2.2}
          dot={false}
          connectNulls
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
