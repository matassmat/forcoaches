/** Tuščia būsena. Visada pasako, ką daryti toliau, o ne tik kad tuščia. */
export function EmptyPanel({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <div className="panel grid place-items-center px-6 py-16 text-center">
      <span className="mb-4 text-muted-foreground [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <h2 className="text-base text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-5 text-muted-foreground">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
