import { Link2Off } from 'lucide-react'
import { useAthleteContext } from '@/hooks/useAthleteContext'
import { EmptyPanel } from '@/components/EmptyPanel'
import { MeasurementsPanel } from '@/components/MeasurementsPanel'
import { PageHeader } from '@/components/PageHeader'
import { StrengthRecords } from '@/components/StrengthRecords'
import { Skeleton } from '@/components/ui/skeleton'

export function AthleteProgress() {
  const { athlete, loading } = useAthleteContext()

  return (
    <div>
      <PageHeader
        title="Progresas"
        subtitle="Kūno matavimai ir jėgos rekordai. Pildyti visų matavimų laukų nebūtina."
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
        <>
          <MeasurementsPanel athleteId={athlete.id} />
          <StrengthRecords athleteId={athlete.id} />
        </>
      )}
    </div>
  )
}
