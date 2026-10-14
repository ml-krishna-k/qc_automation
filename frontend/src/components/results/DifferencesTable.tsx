import type { DifferenceRow } from '@/types/domain'
import { ChangeTypeBadge } from './ChangeTypeBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchIcon } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { toDisplayedDifference } from '@/utils/differenceDisplay'

function ValueCell({ value, emphasis }: { value: string | null; emphasis?: 'add' | 'remove' }) {
  if (value === null || value === '') {
    return <span className="italic text-ink-faint">—</span>
  }
  return (
    <span
      className={cn(
        'break-words',
        emphasis === 'add' && 'text-added',
        emphasis === 'remove' && 'text-removed line-through decoration-removed/50',
      )}
    >
      {value}
    </span>
  )
}

export function DifferencesTable({ rows }: { rows: DifferenceRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<SearchIcon className="size-5" />}
        title="No differences match your filters"
        description="Try clearing the search or change-type filters to see more rows."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
            <th scope="col" className="py-2.5 pr-4 font-medium">Tag Number</th>
            <th scope="col" className="py-2.5 pr-4 font-medium">Column</th>
            <th scope="col" className="py-2.5 pr-4 font-medium">Original value</th>
            <th scope="col" className="py-2.5 pr-4 font-medium">Revised value</th>
            <th scope="col" className="py-2.5 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const display = toDisplayedDifference(row)
            return (
              <tr key={row.id} className="border-b border-line/70 last:border-0 hover:bg-sunken/50">
                <td className="py-2.5 pr-4 font-mono text-[13px] font-medium text-ink">{row.tagNumber}</td>
                <td className="py-2.5 pr-4 text-ink-soft">{display.columnLabel}</td>
                <td className="py-2.5 pr-4 max-w-56">
                  <ValueCell value={display.originalDisplay} />
                </td>
                <td className="py-2.5 pr-4 max-w-56">
                  <ValueCell value={display.revisedDisplay} />
                </td>
                <td className="py-2.5 pr-4">
                  <div className="flex flex-col gap-1">
                    <ChangeTypeBadge type={row.changeType} />
                    {row.errorMessage && <span className="text-xs text-ink-faint">{row.errorMessage}</span>}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
