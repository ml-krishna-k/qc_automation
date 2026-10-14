import { SearchIcon } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import type { ChangeType } from '@/types/domain'
import type { UseDifferenceFiltersResult } from '@/hooks/useDifferenceFilters'

const FILTER_OPTIONS: { type: ChangeType; label: string }[] = [
  { type: 'changed', label: 'Changed' },
  { type: 'added', label: 'Added' },
  { type: 'removed', label: 'Removed' },
  { type: 'error', label: 'Errors' },
]

export function DifferencesToolbar({ filters, setQuery, toggleChangeType, clear }: UseDifferenceFiltersResult) {
  const hasActiveFilters = filters.query !== '' || filters.changeTypes.length > 0

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tag, column, or value…"
          aria-label="Search differences"
          className="h-9 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTER_OPTIONS.map(({ type, label }) => {
          const active = filters.changeTypes.includes(type)
          return (
            <button
              key={type}
              type="button"
              aria-pressed={active}
              onClick={() => toggleChangeType(type)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150',
                active ? 'border-brand-500 bg-brand-100 text-brand-800' : 'border-line-strong bg-surface text-ink-soft hover:border-brand-500',
              )}
            >
              {label}
            </button>
          )
        })}
        {hasActiveFilters && (
          <button type="button" onClick={clear} className="px-2 text-xs font-medium text-ink-faint underline hover:text-ink">
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
