import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Toaster } from 'sonner'
import {
  CalendarCheck, CalendarDays, ClipboardList, Coins, LayoutDashboard, LineChart, Salad, Settings, Users,
} from 'lucide-react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import { AppShell, type NavItem } from '@/components/AppShell'
import { ConfigWarning } from '@/components/ConfigWarning'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { homePathForRole } from '@/lib/routes'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { SignUp } from '@/pages/SignUp'
import { CoachOverview } from '@/pages/coach/Overview'
import { CoachAthletes } from '@/pages/coach/Athletes'
import { CoachBookings } from '@/pages/coach/Bookings'
import { CoachCalendar } from '@/pages/coach/Calendar'
import { CoachFinances } from '@/pages/coach/Finances'
import { CoachPrograms } from '@/pages/coach/Programs'
import { CoachNutrition } from '@/pages/coach/Nutrition'
import { CoachSettings } from '@/pages/coach/Settings'
import { AthleteBookings } from '@/pages/athlete/Bookings'
import { AthleteProgress } from '@/pages/athlete/Progress'
import { AthleteFinances } from '@/pages/athlete/Finances'
import { AthleteProgram } from '@/pages/athlete/Program'
import { AthleteNutrition } from '@/pages/athlete/Nutrition'
import { AthleteOverview } from '@/pages/athlete/Overview'

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
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/prisijungti" element={<Login />} />
          <Route path="/registracija" element={<SignUp />} />

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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </ThemeProvider>
      </ErrorBoundary>
      </MotionConfig>
    </BrowserRouter>
  )
}
