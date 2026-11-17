import { Link2Off } from 'lucide-react'
import { useAthleteContext } from '@/hooks/useAthleteContext'
import { EmptyPanel } from '@/components/EmptyPanel'
import { MeasurementsPanel } from '@/components/MeasurementsPanel'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'

export function AthleteProgress() {
  const { athlete, loading } = useAthleteContext()

  return (
    <div>
      <PageHeader
        title="Progresas"
        subtitle="Svoris, riebalų procentas ir apimtys. Pildyti visų laukų nebūtina."
      />

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : !athlete ? (
        <EmptyPanel
          icon={<Link2Off className="h-6 w-6" />}
          title="Paskyra nesusieta su treneriu"
          text="Registruojantis nebuvo panaudotas pakvietimo kodas. Paprašykite trenerio naujo kodo."
        />
      ) : (
        <MeasurementsPanel athleteId={athlete.id} />
      )}
    </div>
  )
}
