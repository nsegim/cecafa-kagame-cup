'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

interface ChartPoint {
  [key: string]: string | number
}

/** Thin Recharts wrapper — a compact themed sparkline for stat-card trends. */
export function Chart({
  data,
  xKey,
  yKey,
  height = 120,
}: {
  data: ChartPoint[]
  xKey: string
  yKey: string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey={xKey}
          tickFormatter={(value: string) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          minTickGap={24}
        />
        <Tooltip
          labelFormatter={(value: string) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            color: 'var(--popover-foreground)',
          }}
        />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#chart-fill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
