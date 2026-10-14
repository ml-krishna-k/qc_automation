import type { ComparisonSummary } from '@/types/domain'
import { formatPercent } from '@/utils/format'
import { cn } from '@/utils/cn'

interface StatTileProps {
  label: string
  value: number
  tone: 'neutral' | 'changed' | 'added' | 'removed' | 'warn'
  hint?: string
}

const toneClasses: Record<StatTileProps['tone'], string> = {
  neutral: 'text-ink',
  changed: 'text-changed',
  added: 'text-added',
  removed: 'text-removed',
  warn: 'text-warn',
}

function StatTile({ label, value, tone, hint }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-4 animate-rise">
      <p className="text-xs font-medium text-ink-faint">{label}</p>
      <p className={cn('mt-1.5 text-2xl font-semibold tabular-nums', toneClasses[tone])}>{value.toLocaleString()}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  )
}

export function SummaryCards({ summary }: { summary: ComparisonSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile label="Tags compared" value={summary.totalTagsCompared} tone="neutral" />
      <StatTile label="Changed" value={summary.changedCount} tone="changed" hint={formatPercent(summary.changedCount, summary.totalTagsCompared)} />
      <StatTile label="Added" value={summary.addedCount} tone="added" />
      <StatTile label="Removed" value={summary.removedCount} tone="removed" />
      <StatTile label="Validation errors" value={summary.errorCount} tone="warn" />
      <StatTile label="Unchanged" value={summary.unchangedCount} tone="neutral" />
    </div>
  )
}
