import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDateShortLt } from '@/lib/time'
import type { MeasureKey } from '@/lib/measurements'
import { MEASURE_FIELDS } from '@/lib/measurements'
import type { Measurement } from '@/types'

export function MeasurementChart({
  measurements,
  metric,
}: {
  measurements: Measurement[]
  metric: MeasureKey
}) {
  const field = MEASURE_FIELDS.find((f) => f.key === metric)!
  const data = measurements
    .filter((m) => m[metric] != null)
    .map((m) => ({ date: formatDateShortLt(m.measuredOn), value: Number(m[metric]) }))

  if (data.length === 0) {
    return (
      <div className="grid h-64 place-items-center text-sm text-muted-foreground">
        Šiam rodikliui dar nėra įrašų
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            // domain su atsarga, kitaip kreivė lipa prie pat kraštų.
            domain={['dataMin - 1', 'dataMax + 1']}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickFormatter={(v: number) => (Math.round(v * 10) / 10).toLocaleString('lt-LT')}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: 'hsl(var(--border))' }}
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              fontSize: 12,
            }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            formatter={(value: number) => [`${value} ${field.unit}`, field.label]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
