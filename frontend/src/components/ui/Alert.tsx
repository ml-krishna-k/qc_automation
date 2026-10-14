import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'error' | 'warn' | 'info'

const toneClasses: Record<Tone, string> = {
  error: 'bg-removed-bg border-removed/20 text-removed',
  warn: 'bg-warn-bg border-warn/20 text-warn',
  info: 'bg-brand-50 border-brand-300/30 text-brand-800',
}

export function Alert({ tone = 'error', title, children, icon }: { tone?: Tone; title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div role="alert" className={cn('flex gap-3 rounded-xl border px-4 py-3 animate-rise', toneClasses[tone])}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="space-y-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {children && <p className="text-sm opacity-90">{children}</p>}
      </div>
    </div>
  )
}
