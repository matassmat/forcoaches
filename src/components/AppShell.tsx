import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Menu, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/Logo'
import { NotificationBell } from '@/components/NotificationBell'
import { ThemeToggle } from '@/components/ThemeToggle'
import { enter, exit, gentle, overlayFade, snappy } from '@/lib/motion'
import { cn } from '@/lib/utils'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Tik pačiam skyriaus šaknies keliui, kitaip jis liktų aktyvus visur. */
  end?: boolean
}

function Nav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}>
          {({ isActive }) => (
            <span
              className={cn(
                'relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* Aktyvus punktas: pakeltas paviršius su plaukelio linija.
                  Fonas nuslysta iš ankstesnio punkto, tad matosi, kur nuėjai. */}
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  transition={snappy}
                  className="absolute inset-0 -z-10 rounded-md bg-card shadow-[0_0_0_1px_hsl(var(--border))]"
                />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function UserBlock() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const initials = ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() || '?'

  return (
    <div className="flex items-center gap-3 px-1">
      {/* Inicialai vietoj nuotraukos: avataro įkėlimo dar nėra. */}
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground/10 text-xs font-medium text-foreground">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{user?.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        aria-label="Atsijungti"
        title="Atsijungti"
        className="btn-lift grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Bendras prisijungusiųjų karkasas: šoninis meniu ir turinys. */
export function AppShell({ items }: { items: NavItem[] }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Atidarytas stalčius neturi leisti slinkti fono, kitaip po juo
  // nuslenka puslapis ir grįžus atsiduri kitoje vietoje.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Mobilus viršus */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
        <Logo size="sm" />
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Atidaryti meniu"
            className="btn-lift grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobilus stalčius */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              variants={overlayFade}
              initial="hidden"
              animate="visible"
              exit="out"
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0, transition: gentle }}
              exit={{ x: '-100%', transition: exit }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-sidebar p-3 lg:hidden"
            >
              <div className="mb-4 flex h-10 items-center justify-between pl-3">
                <Logo size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Uždaryti meniu"
                  className="btn-lift grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Nav items={items} onNavigate={() => setMobileOpen(false)} />
              <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                <div className="min-w-0 flex-1"><UserBlock /></div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar p-3 lg:flex">
        <div className="mb-4 flex h-10 items-center justify-between pl-3">
          <Logo size="sm" />
          <div className="flex items-center">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>

        <Nav items={items} />

        <div className="mt-auto border-t border-border pt-3">
          <UserBlock />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* mode="wait": senas puslapis pirma dingsta. Be to abu trumpam
              persidengia ir turinys pašoka. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: enter }}
              exit={{ opacity: 0, transition: exit }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
