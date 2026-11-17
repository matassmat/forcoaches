import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarketingPage } from '@/components/marketing/SiteChrome'
import { SetBoxes } from '@/components/marketing/mocks'
import { useSeo } from '@/lib/seo'

export function NotFound() {
  useSeo({ title: 'Puslapis nerastas', description: 'Tokio puslapio nėra. Grįžkite į pradžią.', noindex: true })

  return (
    <MarketingPage>
      <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center sm:py-32">
        <SetBoxes total={4} done={0} className="mb-8" />
        <p className="text-sm text-muted-foreground">Klaida 404</p>
        <h1 className="display-lg mt-3 text-foreground">Šios serijos programoje nėra</h1>
        <p className="mt-4 text-muted-foreground">
          Puslapis, kurio ieškote, perkeltas arba niekada neegzistavo. Patikrinkite adresą arba pradėkite iš pradžių.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4" />
              Į pradžią
            </Button>
          </Link>
          <Link to="/kontaktai"><Button variant="outline">Pranešti apie klaidą</Button></Link>
        </div>
      </section>
    </MarketingPage>
  )
}
