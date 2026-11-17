import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "success" | "warning" | "destructive" | "secondary"
}

/**
 * Būsena kaip tylus tekstas su tašku. Spalvotos piliulės ant kiekvienos
 * eilutės rėkia garsiau už turinį, o taškas pasako tą patį.
 */
function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const dots: Record<string, string> = {
    default: "bg-primary",
    secondary: "bg-foreground/30",
    outline: "bg-foreground/30",
    success: "bg-positive",
    warning: "bg-warning",
    destructive: "bg-destructive",
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-muted-foreground",
        className
      )}
      {...props}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dots[variant])} />
      {children}
    </span>
  )
}

export { Badge }
