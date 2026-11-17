import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface Shortcut {
  to: string
  icon: LucideIcon
  title: string
  text: string
}

/** Skyrių sąrašas apžvalgoje. Vienas blokas, ne keturios vienodos kortelės. */
export function ShortcutGrid({ items }: { items: Shortcut[] }) {
  return (
    <div className="panel divide-y divide-border">
      {items.map(({ to, icon: Icon, title, text }) => (
        <Link
          key={to}
          to={to}
          className="group flex items-center gap-4 px-5 py-4 transition-colors duration-150 first:rounded-t-[13px] last:rounded-b-[13px] hover:bg-muted/60"
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">{title}</p>
            <p className="truncate text-sm text-muted-foreground">{text}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-foreground" />
        </Link>
      ))}
    </div>
  )
}
