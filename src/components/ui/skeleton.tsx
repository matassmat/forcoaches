import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // Perbėgantis atspindys vietoj pulsavimo, geriau perteikia „kraunasi",
      // o ne „mirksi klaida".
      className={cn("anim-shimmer relative overflow-hidden rounded-lg bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
