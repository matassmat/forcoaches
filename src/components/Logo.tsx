import { cn } from '@/lib/utils'

/** Ženklas: trys kylantys stulpeliai, viena spalva, be blizgesio. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn('h-5 w-5 shrink-0 text-primary', className)} fill="currentColor" aria-hidden>
      <rect x="1" y="11" width="4.5" height="8" rx="1.25" />
      <rect x="7.75" y="6" width="4.5" height="13" rx="1.25" />
      <rect x="14.5" y="1" width="4.5" height="18" rx="1.25" />
    </svg>
  )
}

export function Logo({ className, size = 'default' }: { className?: string; size?: 'sm' | 'default' }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
      <span className={cn('font-medium text-foreground', size === 'sm' ? 'text-[15px]' : 'text-[17px]')}>
        ForCoaches
      </span>
    </span>
  )
}
