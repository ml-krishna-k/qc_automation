import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center animate-fade">
      <div className="flex size-12 items-center justify-center rounded-full bg-sunken text-ink-faint">{icon}</div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-ink-faint">{description}</p>
      </div>
      {action}
    </div>
  )
}
