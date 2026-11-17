import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline" | "destructive" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  /** Rodo sukutį ir blokuoja mygtuką. Plotis nekinta, tad sąsaja nešokteli. */
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading = false, disabled, children, ...props }, ref) => {
    const base = [
      "btn-lift relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
      "rounded-md font-medium",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:pointer-events-none disabled:opacity-50",
    ].join(" ")

    // Akcentas tik pagrindiniam veiksmui. Visi kiti mygtukai neutralūs,
    // kad ekrane būtų aišku, kuris vienas yra svarbiausias.
    const variants: Record<string, string> = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "bg-muted text-foreground hover:bg-foreground/10",
      ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
      outline: "border border-border bg-card text-foreground hover:bg-muted",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    }

    const sizes: Record<string, string> = {
      default: "h-10 px-4 text-sm",
      sm: "h-9 px-3 text-sm",
      lg: "h-11 px-5 text-[15px]",
      icon: "h-9 w-9",
    }

    return (
      <button
        className={cn(base, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 shrink-0 anim-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
