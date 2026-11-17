import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Check } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { ease, exit } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** Varpelis su neskaitytų skaitikliu ir trumpu sąrašu. */
export function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Paspaudus šalia, užsidaro. Be to sąrašas liktų kaboti visą laiką.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Pranešimai (${unread} nauji)` : 'Pranešimai'}
        className="btn-lift relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-sidebar" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease } }}
            exit={{ opacity: 0, y: -4, transition: exit }}
            className="panel absolute right-0 top-11 z-50 max-h-96 w-80 overflow-y-auto p-0 shadow-[0_8px_24px_rgba(0,0,0,0.08)] lg:left-0 lg:right-auto"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="eyebrow">Pranešimai</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Check className="h-4 w-4" />
                  Žymėti skaitytais
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Pranešimų nėra</p>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => !n.isRead && markRead(n.id)}
                    className={cn(
                      'block w-full px-4 py-3 text-left transition-colors duration-150 hover:bg-muted',
                      !n.isRead && 'bg-muted/60'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      <div className={cn('min-w-0 flex-1', n.isRead && 'pl-4')}>
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        {n.message && (
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.message}</p>
                        )}
                        <p className="mono mt-1 text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString('lt-LT', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
