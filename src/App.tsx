import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { toast, Toaster } from 'sonner'
import {
  CalendarCheck, CalendarDays, ClipboardList, Coins, LayoutDashboard, LineChart, Salad, Settings, Users,
} from 'lucide-react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import { AppShell, type NavItem } from '@/components/AppShell'
import { ConfigWarning } from '@/components/ConfigWarning'
import { CookieConsent } from '@/components/CookieConsent'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { homePathForRole } from '@/lib/routes'
import { trackPageView } from '@/lib/analytics'
import { errorMessage } from '@/lib/errors'
import { SITE } from '@/lib/site'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { SignUp } from '@/pages/SignUp'
import { NotFound } from '@/pages/site/NotFound'
import { ThankYou } from '@/pages/site/ThankYou'

// Programos sritys ir antriniai puslapiai kraunami tik atidarius, kad
// pradinis puslapis būtų lengvas.
const CoachOverview = lazy(() => import('@/pages/coach/Overview').then((m) => ({ default: m.CoachOverview })))
const CoachAthletes = lazy(() => import('@/pages/coach/Athletes').then((m) => ({ default: m.CoachAthletes })))
const CoachBookings = lazy(() => import('@/pages/coach/Bookings').then((m) => ({ default: m.CoachBookings })))
const CoachCalendar = lazy(() => import('@/pages/coach/Calendar').then((m) => ({ default: m.CoachCalendar })))
const CoachFinances = lazy(() => import('@/pages/coach/Finances').then((m) => ({ default: m.CoachFinances })))
const CoachPrograms = lazy(() => import('@/pages/coach/Programs').then((m) => ({ default: m.CoachPrograms })))
const CoachNutrition = lazy(() => import('@/pages/coach/Nutrition').then((m) => ({ default: m.CoachNutrition })))
const CoachSettings = lazy(() => import('@/pages/coach/Settings').then((m) => ({ default: m.CoachSettings })))
const AthleteBookings = lazy(() => import('@/pages/athlete/Bookings').then((m) => ({ default: m.AthleteBookings })))
const AthleteProgress = lazy(() => import('@/pages/athlete/Progress').then((m) => ({ default: m.AthleteProgress })))
const AthleteFinances = lazy(() => import('@/pages/athlete/Finances').then((m) => ({ default: m.AthleteFinances })))
const AthleteProgram = lazy(() => import('@/pages/athlete/Program').then((m) => ({ default: m.AthleteProgram })))
const AthleteNutrition = lazy(() => import('@/pages/athlete/Nutrition').then((m) => ({ default: m.AthleteNutrition })))
const AthleteOverview = lazy(() => import('@/pages/athlete/Overview').then((m) => ({ default: m.AthleteOverview })))
const Privacy = lazy(() => import('@/pages/site/Privacy').then((m) => ({ default: m.Privacy })))
const CaseStudies = lazy(() => import('@/pages/site/CaseStudies').then((m) => ({ default: m.CaseStudies })))
const CaseStudyPage = lazy(() => import('@/pages/site/CaseStudies').then((m) => ({ default: m.CaseStudyPage })))
const Contact = lazy(() => import('@/pages/site/Contact').then((m) => ({ default: m.Contact })))
const ForgotPassword = lazy(() => import('@/pages/PasswordReset').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('@/pages/PasswordReset').then((m) => ({ default: m.ResetPassword })))

const coachNav: NavItem[] = [
  { to: '/treneris', label: 'Apžvalga', icon: LayoutDashboard, end: true },
  { to: '/treneris/sportininkai', label: 'Sportininkai', icon: Users },
  { to: '/treneris/kalendorius', label: 'Kalendorius', icon: CalendarDays },
  { to: '/treneris/rezervacijos', label: 'Rezervacijos', icon: CalendarCheck },
  { to: '/treneris/programos', label: 'Programos', icon: ClipboardList },
  { to: '/treneris/mityba', label: 'Mityba', icon: Salad },
  { to: '/treneris/finansai', label: 'Finansai', icon: Coins },
  { to: '/treneris/nustatymai', label: 'Nustatymai', icon: Settings },
]

const athleteNav: NavItem[] = [
  { to: '/sportininkas', label: 'Apžvalga', icon: LayoutDashboard, end: true },
  { to: '/sportininkas/rezervacijos', label: 'Rezervacijos', icon: CalendarCheck },
  { to: '/sportininkas/progresas', label: 'Progresas', icon: LineChart },
  { to: '/sportininkas/programa', label: 'Programa', icon: ClipboardList },
  { to: '/sportininkas/mityba', label: 'Mityba', icon: Salad },
  { to: '/sportininkas/atsiskaitymai', label: 'Atsiskaitymai', icon: Coins },
]

/**
 * Šaknis: svečiui rodo pristatymo puslapį, prisijungusiam – jo rolės sritį.
 * Taip po prisijungimo nereikia žinoti rolės pačioje formoje.
 */
function RootRoute() {
  const { isAuthenticated, role, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (isAuthenticated && role) return <Navigate to={homePathForRole[role]} replace />
  return <Landing />
}

/**
 * Kas vyksta keičiantis maršrutui: slinktis į viršų arba prie #skyriaus,
 * analitikos puslapio peržiūra ir programos vidaus puslapių pavadinimai.
 */
function RouteEffects() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      // Palaukiame, kol puslapis nupieštas, tada slenkame prie skyriaus.
      const id = decodeURIComponent(hash.slice(1))
      const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 60)
      return () => clearTimeout(t)
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  useEffect(() => {
    const item = [...coachNav, ...athleteNav].find((n) => n.to === pathname)
    if (item) {
      const area = pathname.startsWith('/treneris') ? 'Treneris' : 'Sportininkas'
      document.title = `${item.label} · ${area} | ${SITE.name}`
      document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow')
    }
    // Pavadinimą puslapis nustato per useSeo, todėl peržiūra siunčiama po jo.
    const t = window.setTimeout(() => trackPageView(pathname), 0)
    return () => clearTimeout(t)
  }, [pathname])

  // Paskutinė apsauga: bet kuri nepagauta asinchroninė klaida parodoma
  // žmogui lietuviškai, o ne tyliai dingsta konsolėje.
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      console.error(event.reason)
      toast.error(errorMessage(event.reason, 'Veiksmas nepavyko. Bandykite dar kartą.'))
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [])

  return null
}

/** Sonner nežino apie mūsų temą, todėl ją reikia paduoti atskirai. */
function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster position="top-center" richColors theme={theme} closeButton />
}

export default function App() {
  return (
    <BrowserRouter>
      {/* reducedMotion="user", visi motion komponentai patys paklūsta
          sistemos nustatymui, nereikia to kartoti kiekvienoje vietoje. */}
      <MotionConfig reducedMotion="user">
      <ErrorBoundary>
      <ThemeProvider>
      <AuthProvider>
        <ThemedToaster />
        <ConfigWarning />
        <RouteEffects />
        <CookieConsent />
        <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/prisijungti" element={<Login />} />
          <Route path="/registracija" element={<SignUp />} />
          <Route path="/slaptazodis" element={<ForgotPassword />} />
          <Route path="/naujas-slaptazodis" element={<ResetPassword />} />
          <Route path="/aciu" element={<ThankYou />} />
          <Route path="/kontaktai" element={<Contact />} />
          <Route path="/privatumas" element={<Privacy />} />
          <Route path="/pavyzdziai" element={<CaseStudies />} />
          <Route path="/pavyzdziai/:slug" element={<CaseStudyPage />} />

          <Route
            path="/treneris"
            element={
              <ProtectedRoute allow="coach">
                <AppShell items={coachNav} />
              </ProtectedRoute>
            }
          >
            <Route index element={<CoachOverview />} />
            <Route path="sportininkai" element={<CoachAthletes />} />
            <Route path="kalendorius" element={<CoachCalendar />} />
            <Route path="rezervacijos" element={<CoachBookings />} />
            <Route path="programos" element={<CoachPrograms />} />
            <Route path="mityba" element={<CoachNutrition />} />
            <Route path="finansai" element={<CoachFinances />} />
            <Route path="nustatymai" element={<CoachSettings />} />
          </Route>

          <Route
            path="/sportininkas"
            element={
              <ProtectedRoute allow="athlete">
                <AppShell items={athleteNav} />
              </ProtectedRoute>
            }
          >
            <Route index element={<AthleteOverview />} />
            <Route path="rezervacijos" element={<AthleteBookings />} />
            <Route path="progresas" element={<AthleteProgress />} />
            <Route path="programa" element={<AthleteProgram />} />
            <Route path="mityba" element={<AthleteNutrition />} />
            <Route path="atsiskaitymai" element={<AthleteFinances />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </AuthProvider>
      </ThemeProvider>
      </ErrorBoundary>
      </MotionConfig>
    </BrowserRouter>
  )
}
