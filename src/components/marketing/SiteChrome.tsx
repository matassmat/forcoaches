import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { openCookieSettings } from '@/components/CookieConsent'
import { useJsonLd } from '@/lib/seo'
import { SITE } from '@/lib/site'

export const NAV_LINKS = [
  { href: '/#rezervacijos', label: 'Rezervacijos' },
  { href: '/#programos', label: 'Programos' },
  { href: '/#mityba', label: 'Mityba' },
  { href: '/pavyzdziai', label: 'Pavyzdžiai' },
  { href: '/#duk', label: 'DUK' },
]

/** Viršutinė juosta visiems viešiems puslapiams. */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" aria-label="ForCoaches pradžia"><Logo /></Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Pagrindinė navigacija">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} to={link.href} className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:grid" />
          <Link to="/prisijungti" className="hidden px-3 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground sm:block">
            Prisijungti
          </Link>
          <Link to="/registracija" className="hidden sm:block">
            <Button size="sm">Sukurti paskyrą</Button>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Uždaryti meniu' : 'Atidaryti meniu'}
            aria-expanded={menuOpen}
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobili navigacija">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} to={link.href} onClick={() => setMenuOpen(false)} className="py-2 text-sm text-foreground">
                {link.label}
              </Link>
            ))}
            <Link to="/prisijungti" className="py-2 text-sm text-foreground">Prisijungti</Link>
          </nav>
        </div>
      )}
    </header>
  )
}

/** Apatinė juosta: vidinės nuorodos, kontaktai, teisinė informacija. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-sidebar">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo size="sm" />
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
            Rezervacijos, programos, mityba ir atsiskaitymai asmeniniam treneriui viename lange.
          </p>
        </div>

        <FooterColumn title="Produktas" links={[
          { to: '/#rezervacijos', label: 'Rezervacijos' },
          { to: '/#programos', label: 'Treniruočių programos' },
          { to: '/#progresas', label: 'Progreso sekimas' },
          { to: '/#mityba', label: 'Mitybos planai' },
        ]} />

        <FooterColumn title="Daugiau" links={[
          { to: '/pavyzdziai', label: 'Kaip dirba treneriai' },
          { to: '/#duk', label: 'Dažni klausimai' },
          { to: '/kontaktai', label: 'Kontaktai' },
          { to: '/registracija', label: 'Sukurti paskyrą' },
        ]} />

        <div>
          <p className="text-sm text-foreground">Pagalba</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Atsakome per {SITE.responseTime}.
          </p>
          {SITE.contactEmail && (
            <a href={`mailto:${SITE.contactEmail}`} className="link-underline mt-1 block text-sm text-foreground">
              {SITE.contactEmail}
            </a>
          )}
          <Link to="/kontaktai" className="link-underline mt-1 block text-sm text-foreground">Parašyti žinutę</Link>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-muted-foreground">
          <span className="tabular-nums">© {new Date().getFullYear()} {SITE.company.legalName || SITE.name}</span>
          <div className="flex flex-wrap gap-5">
            <Link to="/privatumas" className="hover:text-foreground">Privatumo politika</Link>
            <button type="button" onClick={openCookieSettings} className="hover:text-foreground">Slapukų nustatymai</button>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="text-sm text-foreground">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Naršymo kelias su BreadcrumbList struktūrizuotais duomenimis. */
export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  const all = [{ label: 'Pradžia', to: '/' }, ...items]
  const key = all.map((i) => i.label).join('>')

  useJsonLd(`breadcrumbs-${key}`, useBreadcrumbData(all))

  return (
    <nav aria-label="Naršymo kelias" className="mb-8">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {all.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            {item.to && i < all.length - 1
              ? <Link to={item.to} className="hover:text-foreground">{item.label}</Link>
              : <span aria-current="page" className="text-foreground">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

const breadcrumbCache = new Map<string, object>()

function useBreadcrumbData(items: { label: string; to?: string }[]) {
  const key = items.map((i) => `${i.label}|${i.to ?? ''}`).join('>')
  if (!breadcrumbCache.has(key)) {
    breadcrumbCache.set(key, {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.label,
        ...(item.to ? { item: `${SITE.url}${item.to === '/' ? '' : item.to}` } : {}),
      })),
    })
  }
  return breadcrumbCache.get(key) as object
}

/** Viešo puslapio rėmas: juosta, turinys, apačia. */
export function MarketingPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
