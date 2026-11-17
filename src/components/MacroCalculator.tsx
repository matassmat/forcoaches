import { useEffect, useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { listMeasurements } from '@/lib/measurements'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, formatNum } from '@/lib/utils'

export interface MacroTargets { kcal: number; protein: number; carbs: number; fat: number }

const ACTIVITY = [
  { value: 1.2, label: 'Sėdimas darbas, be sporto' },
  { value: 1.375, label: '1-3 treniruotės per savaitę' },
  { value: 1.55, label: '3-5 treniruotės per savaitę' },
  { value: 1.725, label: '6-7 treniruotės per savaitę' },
  { value: 1.9, label: 'Fizinis darbas ir treniruotės' },
]

const GOALS = [
  { value: -0.2, label: 'Riebalų deginimas', hint: '-20 %' },
  { value: -0.1, label: 'Lėtas metimas', hint: '-10 %' },
  { value: 0, label: 'Palaikymas', hint: '0 %' },
  { value: 0.1, label: 'Masės rinkimas', hint: '+10 %' },
]

/**
 * Kalorijų ir makro normų skaičiuoklė pagal Mifflin-St Jeor formulę.
 * Baltymai ir riebalai skaičiuojami gramais kilogramui kūno svorio,
 * angliavandeniai užpildo likusias kalorijas. Tai atspirties taškas,
 * treneris skaičius gali pakoreguoti prieš išsaugodamas.
 */
export function MacroCalculator({
  athleteId,
  onApply,
}: {
  athleteId?: string | null
  onApply: (targets: MacroTargets) => void
}) {
  const [sex, setSex] = useState<'m' | 'f'>('m')
  const [age, setAge] = useState('30')
  const [height, setHeight] = useState('178')
  const [weight, setWeight] = useState('80')
  const [activity, setActivity] = useState(1.55)
  const [goal, setGoal] = useState(-0.1)
  const [proteinPerKg, setProteinPerKg] = useState('2')
  const [fatPerKg, setFatPerKg] = useState('0.9')

  // Paskutinis sportininko svoris iš matavimų, kad nereikėtų jo ieškoti.
  useEffect(() => {
    if (!athleteId) return
    listMeasurements(athleteId)
      .then((list) => {
        const last = [...list].reverse().find((m) => m.weightKg != null)
        if (last?.weightKg) setWeight(String(last.weightKg))
      })
      .catch(() => {})
  }, [athleteId])

  const n = (v: string) => Number(v.replace(',', '.')) || 0

  const result = useMemo<(MacroTargets & { bmr: number; tdee: number }) | null>(() => {
    const w = n(weight), h = n(height), a = n(age)
    if (w < 30 || h < 120 || a < 12) return null
    const bmr = 10 * w + 6.25 * h - 5 * a + (sex === 'm' ? 5 : -161)
    const tdee = bmr * activity
    const kcal = Math.round((tdee * (1 + goal)) / 10) * 10
    const protein = Math.round(w * n(proteinPerKg))
    const fat = Math.round(w * n(fatPerKg))
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, carbs, fat }
  }, [sex, age, height, weight, activity, goal, proteinPerKg, fatPerKg])

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-sm text-foreground">
        <Calculator className="h-4 w-4 text-muted-foreground" />
        Normų skaičiuoklė
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Lytis</Label>
          <div className="flex h-10 rounded-md bg-muted p-1 text-sm">
            {(['m', 'f'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSex(s)}
                className={cn(
                  'flex-1 rounded-[5px] transition-colors duration-150',
                  sex === s ? 'bg-card text-foreground shadow-[0_0_0_1px_hsl(var(--border))]' : 'text-muted-foreground'
                )}
              >
                {s === 'm' ? 'Vyras' : 'Moteris'}
              </button>
            ))}
          </div>
        </div>
        <Field id="mc-age" label="Amžius" value={age} onChange={setAge} />
        <Field id="mc-h" label="Ūgis, cm" value={height} onChange={setHeight} />
        <Field id="mc-w" label="Svoris, kg" value={weight} onChange={setWeight} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="mc-act">Aktyvumas</Label>
        <select
          id="mc-act"
          value={activity}
          onChange={(e) => setActivity(Number(e.target.value))}
          className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25"
        >
          {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Tikslas</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGoal(g.value)}
              className={cn(
                'rounded-md border px-3 py-2 text-left text-xs transition-colors duration-150',
                goal === g.value ? 'border-foreground/40 bg-card text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="block">{g.label}</span>
              <span className="mono block text-muted-foreground">{g.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field id="mc-p" label="Baltymai, g/kg" value={proteinPerKg} onChange={setProteinPerKg} />
        <Field id="mc-f" label="Riebalai, g/kg" value={fatPerKg} onChange={setFatPerKg} />
      </div>

      {result && (
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
          <div className="text-xs leading-5 text-muted-foreground">
            <p>Bazinė apykaita {formatNum(result.bmr)} kcal, su aktyvumu {formatNum(result.tdee)} kcal</p>
            <p className="mono text-foreground">
              {formatNum(result.kcal)} kcal · B {result.protein} · A {result.carbs} · R {result.fat}
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => onApply(result)}>
            Naudoti šias normas
          </Button>
        </div>
      )}
    </div>
  )
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" className="mono" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
