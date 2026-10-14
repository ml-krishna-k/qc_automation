import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'neutral' | 'brand' | 'changed' | 'added' | 'removed' | 'warn'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-soft',
  brand: 'bg-brand-100 text-brand-800',
  changed: 'bg-changed-bg text-changed',
  added: 'bg-added-bg text-added',
  removed: 'bg-removed-bg text-removed',
  warn: 'bg-warn-bg text-warn',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium leading-none',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
