import { useEffect, useRef, useState } from 'react'
import {
  durationPx, END_HOUR, HOURS, HOUR_PX, overlapLayout, pad2, snapPx, START_HOUR, timeToPx,
  toHHMM, TONE, TOTAL_PX, toMinutes, type CalendarEvent, type DragMode,
} from '@/components/calendar/grid'
import { cn } from '@/lib/utils'

/**
 * Laiko tinklelis. Perkelta iš Tutorly `WeekTimeGrid`:
 * vilkimas tuščioje vietoje kuria bloką (galima per kelias dienas),
 * vilkimas už esamo bloko jį perkelia.
 */
export function WeekTimeGrid({
  dates,
  events,
  editable,
  dragMode,
  onEventClick,
  onCreate,
  onMove,
}: {
  dates: string[]
  events: CalendarEvent[]
  /** Sportininkas tinklelio neredaguoja, tik spaudžia langus. */
  editable: boolean
  dragMode: DragMode
  onEventClick: (event: CalendarEvent) => void
  onCreate: (dateFrom: string, startTime: string, endTime: string, dateTo?: string) => void
  onMove: (eventId: string, date: string, startTime: string, endTime: string) => void
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ date: string; endDate: string; startPx: number; curPx: number } | null>(null)
  const draggingEvent = useRef<{ id: string; duration: number } | null>(null)
  const [preview, setPreview] = useState<{ dates: string[]; top: number; height: number; startT: string; endT: string } | null>(null)
  const [dropPreview, setDropPreview] = useState<{ date: string; top: number; height: number; startT: string; endT: string } | null>(null)

  const pxInColumn = (clientY: number, dateStr: string) => {
    const col = gridRef.current?.querySelector<HTMLElement>(`[data-col="${dateStr}"]`)
    if (!col) return 0
    return Math.max(0, clientY - col.getBoundingClientRect().top)
  }

  /** Kurios dienos stulpelyje yra žymeklis, leidžia vilkti per kelias dienas. */
  const dateAtX = (clientX: number): string | null => {
    if (!gridRef.current) return null
    for (const d of dates) {
      const col = gridRef.current.querySelector<HTMLElement>(`[data-col="${d}"]`)
      if (!col) continue
      const r = col.getBoundingClientRect()
      if (clientX >= r.left && clientX < r.right) return d
    }
    return null
  }

  const datesBetween = (a: string, b: string) => {
    const [from, to] = a <= b ? [a, b] : [b, a]
    return dates.filter((d) => d >= from && d <= to)
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragState.current) return
      const over = dateAtX(e.clientX)
      if (over) dragState.current.endDate = over

      const py = pxInColumn(e.clientY, dragState.current.date)
      dragState.current.curPx = py

      const lo = Math.min(dragState.current.startPx, py)
      const hi = Math.max(dragState.current.startPx, py)
      const { h: sh, m: sm } = snapPx(lo)
      const { h: eh, m: em } = snapPx(hi)

      setPreview({
        dates: datesBetween(dragState.current.date, dragState.current.endDate),
        top: (sh - START_HOUR + sm / 60) * HOUR_PX,
        height: Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60 * HOUR_PX, 18),
        startT: toHHMM(sh, sm),
        endT: toHHMM(eh, em),
      })
    }

    const onMouseUp = () => {
      if (!dragState.current) return
      const { date, endDate, startPx, curPx } = dragState.current
      const { h: sh, m: sm } = snapPx(Math.min(startPx, curPx))
      const { h: eh, m: em } = snapPx(Math.max(startPx, curPx))

      // Trumpesnis nei 30 min. vilkimas dažniausiai yra netyčinis paspaudimas.
      if ((eh * 60 + em) - (sh * 60 + sm) >= 30) {
        const [from, to] = date <= endDate ? [date, endDate] : [endDate, date]
        onCreate(from, toHHMM(sh, sm), toHHMM(eh, em), to !== from ? to : undefined)
      }

      dragState.current = null
      setPreview(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onCreate, dates]) // eslint-disable-line react-hooks/exhaustive-deps

  const previewTone = dragMode === 'session' ? TONE.confirmed : TONE.free

  return (
    <div ref={gridRef} className="flex select-none" style={{ height: TOTAL_PX, minHeight: TOTAL_PX }}>
      {/* Valandų skalė */}
      <div className="relative w-14 shrink-0 border-r border-border" style={{ height: TOTAL_PX }}>
        {HOURS.map((h) => (
          <div
            key={h}
            className="mono absolute right-0 w-full pr-2 text-right text-[11px] leading-none text-muted-foreground"
            style={{ top: (h - START_HOUR) * HOUR_PX - 5 }}
          >
            {pad2(h)}:00
          </div>
        ))}
      </div>

      {dates.map((dateStr) => {
        const dayEvents = events
          .filter((e) => e.date === dateStr)
          .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || toMinutes(b.endTime) - toMinutes(a.endTime))
        const layout = overlapLayout(dayEvents)

        return (
          <div
            key={dateStr}
            data-col={dateStr}
            className="relative flex-1 border-r border-border last:border-r-0"
            style={{ height: TOTAL_PX, minWidth: 56, cursor: editable ? 'crosshair' : 'default' }}
            onMouseDown={editable ? (e) => {
              // Ant esamo bloko vilkimas reiškia perkėlimą, ne naują bloką.
              if ((e.target as HTMLElement).closest('[data-event]')) return
              e.preventDefault()
              const py = Math.max(0, e.clientY - e.currentTarget.getBoundingClientRect().top)
              dragState.current = { date: dateStr, endDate: dateStr, startPx: py, curPx: py + HOUR_PX / 2 }
            } : undefined}
            onDragOver={editable ? (e) => {
              if (!e.dataTransfer.types.includes('text/event-id')) return
              e.preventDefault()
              const py = Math.max(0, e.clientY - e.currentTarget.getBoundingClientRect().top)
              const { h, m } = snapPx(py)
              const duration = draggingEvent.current?.duration ?? 60
              const start = Math.max(START_HOUR * 60, Math.min(h * 60 + m, END_HOUR * 60 - duration))
              setDropPreview({
                date: dateStr,
                top: (start / 60 - START_HOUR) * HOUR_PX,
                height: Math.max(duration / 60 * HOUR_PX, 18),
                startT: toHHMM(Math.floor(start / 60), start % 60),
                endT: toHHMM(Math.floor((start + duration) / 60), (start + duration) % 60),
              })
            } : undefined}
            onDragLeave={editable ? () => setDropPreview(null) : undefined}
            onDrop={editable ? (e) => {
              setDropPreview(null)
              const eventId = e.dataTransfer.getData('text/event-id')
              if (!eventId) return
              e.preventDefault()
              const py = Math.max(0, e.clientY - e.currentTarget.getBoundingClientRect().top)
              const { h, m } = snapPx(py)
              const duration = Number(e.dataTransfer.getData('text/event-duration') || '60')
              const start = Math.max(START_HOUR * 60, Math.min(h * 60 + m, END_HOUR * 60 - duration))
              onMove(
                eventId,
                dateStr,
                toHHMM(Math.floor(start / 60), start % 60),
                toHHMM(Math.floor((start + duration) / 60), (start + duration) % 60)
              )
            } : undefined}
          >
            {HOURS.map((h) => (
              <div key={h} className="absolute w-full border-t border-border/60" style={{ top: (h - START_HOUR) * HOUR_PX }} />
            ))}
            {HOURS.map((h) => (
              <div key={`half${h}`} className="absolute w-full border-t border-dashed border-border/30" style={{ top: (h - START_HOUR) * HOUR_PX + HOUR_PX / 2 }} />
            ))}

            {dayEvents.map((event) => {
              const tone = TONE[event.tone]
              const height = durationPx(event.startTime, event.endTime)
              const meta = layout.get(event.id) ?? { left: 0, width: 100, z: 10 }
              const movable = editable && (event.type === 'slot' || event.type === 'session')

              return (
                <div
                  key={event.id}
                  data-event="1"
                  role="button"
                  tabIndex={0}
                  onClick={() => onEventClick(event)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEventClick(event) }
                  }}
                  draggable={movable}
                  onDragStart={movable ? (e) => {
                    const duration = Math.max(15, toMinutes(event.endTime) - toMinutes(event.startTime))
                    e.dataTransfer.setData('text/event-id', event.id)
                    e.dataTransfer.setData('text/event-duration', String(duration))
                    e.dataTransfer.effectAllowed = 'move'
                    draggingEvent.current = { id: event.id, duration }
                  } : undefined}
                  className={cn(
                    'absolute overflow-hidden rounded-md border-l-[3px] transition-shadow duration-150',
                    'hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    movable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                    event.type === 'request' && 'ring-1 ring-warning/40'
                  )}
                  style={{
                    top: timeToPx(event.startTime),
                    height,
                    left: `calc(${meta.left}% + 2px)`,
                    width: `calc(${meta.width}% - 4px)`,
                    zIndex: meta.z,
                    backgroundColor: tone.bg,
                    borderLeftColor: tone.border,
                  }}
                >
                  <div className="px-1.5 py-1">
                    <p className="mono text-[11px] font-medium leading-tight" style={{ color: tone.text }}>
                      {event.startTime}
                    </p>
                    {height > 30 && (
                      <p className="truncate text-[11px] font-medium leading-tight text-foreground">{event.label}</p>
                    )}
                    {height > 48 && event.sub && (
                      <p className="mono truncate text-[11px] leading-tight text-muted-foreground">{event.sub}</p>
                    )}
                  </div>
                </div>
              )
            })}

            {preview?.dates.includes(dateStr) && (
              <div
                className="pointer-events-none absolute inset-x-0.5 z-20 rounded-md border-l-[3px]"
                style={{
                  top: preview.top,
                  height: Math.max(preview.height, 18),
                  backgroundColor: previewTone.bg,
                  borderLeftColor: previewTone.border,
                }}
              >
                <p className="mono px-1.5 pt-1 text-[11px] font-medium leading-tight" style={{ color: previewTone.text }}>
                  {preview.startT}-{preview.endT}
                  {preview.dates.length > 1 && dateStr === preview.dates[0] && (
                    <span className="block opacity-80">{preview.dates.length} d.</span>
                  )}
                </p>
              </div>
            )}

            {dropPreview?.date === dateStr && (
              <div
                className="pointer-events-none absolute inset-x-0.5 z-20 rounded-md border-l-[3px] border-dashed"
                style={{
                  top: dropPreview.top,
                  height: Math.max(dropPreview.height, 18),
                  backgroundColor: 'hsl(var(--primary) / 0.12)',
                  borderLeftColor: 'hsl(var(--primary))',
                  outline: '1px dashed hsl(var(--primary) / 0.5)',
                  outlineOffset: '-1px',
                }}
              >
                <p className="mono px-1.5 pt-1 text-[11px] font-medium leading-tight text-foreground">
                  {dropPreview.startT}-{dropPreview.endT}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
