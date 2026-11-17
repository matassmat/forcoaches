import { useMemo } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { formatEur, monthlySeries, revenueByAthlete, type FinRecordWithAthlete } from '@/lib/finances'

/** Pyrago spalvos: pagrindinė, duomenų ir jų atspalviai. */
const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--data))',
  'hsl(var(--primary) / 0.6)',
  'hsl(var(--data) / 0.6)',
  'hsl(var(--primary) / 0.35)',
  'hsl(var(--data) / 0.35)',
]

const tooltipStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  fontSize: 12,
}

export function FinanceCharts({ records }: { records: FinRecordWithAthlete[] }) {
  const monthly = useMemo(() => monthlySeries(records), [records])
  const byAthlete = useMemo(() => revenueByAthlete(records), [records])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="panel p-5">
        <p className="eyebrow mb-4">Paskutiniai 6 mėnesiai</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                contentStyle={tooltipStyle}
                formatter={(value: number) => formatEur(value)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="gauta" name="Gauta" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="priskaiciuota" name="Priskaičiuota" fill="hsl(var(--data))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel p-5">
        <p className="eyebrow mb-4">Iš ko uždirbta</p>
        {byAthlete.length === 0 ? (
          <div className="grid h-64 place-items-center text-sm text-muted-foreground">Dar nėra duomenų</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byAthlete}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {byAthlete.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatEur(value)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
