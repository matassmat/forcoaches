import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

/**
 * Be šito viena sugedusi vieta nudažo visą ekraną juodai: React išmeta
 * medį, o žmogus nemato net kodėl. Dabar bent parodoma klaida ir kelias atgal.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nulūžo komponentas:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="panel w-full max-w-lg p-8 text-center">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </span>

          <h1 className="text-xl text-foreground">Kažkas nepavyko</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Šis puslapis nulūžo. Perkraukite, jei kartojasi, klaidos tekstas žemiau padės ją rasti.
          </p>

          <pre className="mono mt-5 max-h-40 overflow-auto rounded-md border border-border bg-muted/50 p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>

          <div className="mt-6 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-lift inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <RotateCw className="h-4 w-4" />
              Perkrauti
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/' }}
              className="btn-lift rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
            >
              Į pradžią
            </button>
          </div>
        </div>
      </div>
    )
  }
}
