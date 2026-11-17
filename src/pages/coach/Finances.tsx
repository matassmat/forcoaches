import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Coins, Plus, Printer, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { listAthletes } from '@/lib/athletes'
import {
  addRecord, balancesByAthlete, deleteRecord, formatEur, listRecords, openReport, totals,
  type FinRecordWithAthlete, type FinType,
} from '@/lib/finances'
import { formatDateShortLt, toDateKey } from '@/lib/time'
import { enter, exit, riseItem, staggerParent } from '@/lib/motion'
import { EmptyPanel } from '@/components/EmptyPanel'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { AthleteProfile } from '@/types'
import { errorMessage } from '@/lib/errors'

// recharts kraunamas tik atidarius finansus.
const FinanceCharts = lazy(() =>
  import('@/components/FinanceCharts').then((m) => ({ default: m.FinanceCharts }))
)

export function CoachFinances() {
  const { user } = useAuth()
  const [records, setRecords] = useState<FinRecordWithAthlete[]>([])
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [recordList, athleteList] = await Promise.all([listRecords(user.id), listAthletes(user.id)])
      setRecords(recordList)
      setAthletes(athleteList)
    } catch (e) {
      toast.error(errorMessage(e, 'Nepavyko įkelti finansų'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  const t = useMemo(() => totals(records), [records])
  const balances = useMemo(() => balancesByAthlete(records), [records])

  const athleteName = (id: string) => {
    const a = athletes.find((x) => x.id === id)
    return a ? `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || 'Be vardo' : 'Be vardo'
  }

  const handleDelete = async (id: string) => {
    const previous = records
    setRecords((list) => list.filter((r) => r.id !== id))
    try {
      await deleteRecord(id)
    } catch (e) {
      setRecords(previous)
      toast.error(errorMessage(e, 'Nepavyko ištrinti'))
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader eyebrow="Trenerio sritis" title="Finansai" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Finansai"
        subtitle="Įvykusi treniruotė automatiškai virsta priskaičiavimu. Mokėjimus registruojate patys."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={records.length === 0}
              onClick={() => openReport(records, {
                coachName: user?.fullName ?? 'Treneris',
                scope: 'Visos operacijos',
              })}
            >
              <Printer className="h-4 w-4" />
              Ataskaita
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Naujas įrašas
            </Button>
          </div>
        }
      />

      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="visible"
        className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <Stat label="Gauta" value={t.received} />
        <Stat label="Priskaičiuota" value={t.charged} />
        <Stat label="Neapmokėta" value={t.unpaid} tone={t.unpaid > 0 ? 'accent' : undefined} />
        <Stat label="Balansas" value={t.balance} />
      </motion.div>

      <Tabs defaultValue="records">
        <TabsList className="mb-6">
          <TabsTrigger value="records">Operacijos</TabsTrigger>
          <TabsTrigger value="athletes">Pagal sportininką</TabsTrigger>
          <TabsTrigger value="charts">Grafikai</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          {records.length === 0 ? (
            <EmptyPanel
              icon={<Coins className="h-6 w-6" />}
              title="Įrašų dar nėra"
              text="Pažymėkite treniruotę kaip įvykusią. Priskaičiavimas atsiras automatiškai."
            />
          ) : (
            <div className="panel divide-y divide-border">
              <AnimatePresence initial={false}>
                {records.map((record) => (
                  <motion.div
                    key={record.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: enter }}
                    exit={{ opacity: 0, height: 0, transition: exit }}
                    className="group flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <span className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-md',
                      record.type === 'credit' ? 'bg-muted text-positive' : 'bg-muted text-muted-foreground'
                    )}>
                      {record.type === 'credit'
                        ? <ArrowDownRight className="h-4 w-4" />
                        : <ArrowUpRight className="h-4 w-4" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{record.athleteName}</p>
                      <p className="mono truncate text-xs text-muted-foreground">
                        {formatDateShortLt(record.date)} · {record.description}
                        {record.type === 'debit' && record.status === 'pending' && (
                          <span className="text-warning sm:hidden"> · neapmokėta</span>
                        )}
                      </p>
                    </div>

                    {record.type === 'debit' && record.status === 'pending' && (
                      <Badge variant="warning" className="hidden sm:inline-flex">Neapmokėta</Badge>
                    )}

                    <span className={cn(
                      'mono shrink-0 text-sm font-medium',
                      record.type === 'credit' ? 'text-positive' : 'text-foreground'
                    )}>
                      {record.type === 'credit' ? '+' : '−'}{formatEur(record.amount)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDelete(record.id)}
                      aria-label="Ištrinti įrašą"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="athletes">
          {balances.size === 0 ? (
            <EmptyPanel icon={<Coins className="h-6 w-6" />} title="Dar nėra ką rodyti" text="Balansai atsiras po pirmos įvykusios treniruotės." />
          ) : (
            <motion.div variants={staggerParent} initial="hidden" animate="visible" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[...balances.entries()]
                .sort((a, b) => a[1] - b[1])
                .map(([athleteId, balance]) => (
                  <motion.div key={athleteId} variants={riseItem} className="panel p-5">
                    <p className="truncate font-medium text-foreground">{athleteName(athleteId)}</p>
                    <p className={cn(
                      'stat-num mt-2 text-2xl',
                      balance < 0 ? 'text-destructive' : 'text-positive'
                    )}>
                      {formatEur(balance)}
                    </p>
                    <p className="mono mt-1 text-xs text-muted-foreground">
                      {balance < 0 ? 'skolingas' : balance > 0 ? 'permoka' : 'atsiskaityta'}
                    </p>
                  </motion.div>
                ))}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="charts">
          <Suspense fallback={<Skeleton className="h-80 w-full" />}>
            <FinanceCharts records={records} />
          </Suspense>
        </TabsContent>
      </Tabs>

      <AddRecordDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        coachId={user?.id}
        athletes={athletes}
        onAdded={load}
      />
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'accent' }) {
  return (
    <motion.div variants={riseItem} className="panel p-4 sm:p-5">
      <p className="eyebrow">{label}</p>
      <p className={cn(
        'stat-num mt-2 text-xl sm:text-2xl',
        tone === 'accent' ? 'text-primary' : 'text-foreground'
      )}>
        {formatEur(value)}
      </p>
    </motion.div>
  )
}

function AddRecordDialog({
  open, onOpenChange, coachId, athletes, onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  coachId?: string
  athletes: AthleteProfile[]
  onAdded: () => Promise<void>
}) {
  const [type, setType] = useState<FinType>('credit')
  const [athleteId, setAthleteId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(toDateKey(new Date()))
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coachId || !athleteId) return

    const value = Number(amount.replace(',', '.'))
    if (Number.isNaN(value) || value <= 0) {
      toast.error('Įveskite teigiamą sumą')
      return
    }

    setSaving(true)
    try {
      await addRecord({ coachId, athleteId, type, amount: value, description, date })
      onOpenChange(false)
      setAmount(''); setDescription('')
      toast.success(type === 'credit' ? 'Mokėjimas užregistruotas' : 'Priskaičiavimas pridėtas')
      await onAdded()
    } catch (err) {
      toast.error(errorMessage(err, 'Nepavyko išsaugoti'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Naujas įrašas</DialogTitle>
          <DialogDescription>
            Mokėjimas mažina skolą, priskaičiavimas ją didina.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {([['credit', 'Mokėjimas gautas'], ['debit', 'Priskaičiuoti']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                aria-pressed={type === value}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                  type === value ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fin-athlete">Sportininkas</Label>
            <select
              id="fin-athlete"
              required
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/25"
            >
              <option value="">- pasirinkite -</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {`${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || 'Be vardo'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fin-amount">Suma, €</Label>
              <Input id="fin-amount" required inputMode="decimal" className="mono" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-date">Data</Label>
              <Input id="fin-date" type="date" className="mono" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fin-desc">Aprašymas <span className="font-normal text-muted-foreground">(nebūtina)</span></Label>
            <Input id="fin-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="pvz. 10 treniruočių abonementas" />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Atšaukti</Button>
            <Button type="submit" loading={saving}>Išsaugoti</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
