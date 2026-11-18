import { AccountPanel } from '@/components/AccountPanel'
import { PageHeader } from '@/components/PageHeader'

export function AthleteAccount() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Paskyra" subtitle="Asmeniniai duomenys, slaptažodis ir jūsų duomenų kopija." />
      <AccountPanel />
    </div>
  )
}
