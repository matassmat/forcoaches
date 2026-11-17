export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  /** Trumpa žyma virš antraštės, kai ji ką nors pasako, pvz. „Šablonas“. */
  eyebrow?: string
  title: string
  subtitle?: string
  /** Pagrindinis puslapio veiksmas, vienoje eilėje su antrašte. */
  action?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-[28px] text-foreground">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm leading-5 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
