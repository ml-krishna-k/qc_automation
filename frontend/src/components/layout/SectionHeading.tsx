import type { ReactNode } from 'react'

export function SectionHeading({
  step,
  title,
  description,
  action,
}: {
  step: number
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-800 text-[11px] font-semibold text-brand-100">
          {step}
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="text-sm text-ink-faint">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}
