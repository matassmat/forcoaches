import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/Logo'

/** Bendras rėmas prisijungimo ir registracijos formoms. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between px-6">
        <Link to="/"><Logo size="sm" /></Link>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Į pradžią
        </Link>
      </header>

      <main className="grid flex-1 place-items-center px-4 pb-16 pt-4">
        <div className="panel w-full max-w-md p-6 sm:p-8">{children}</div>
      </main>
    </div>
  )
}
