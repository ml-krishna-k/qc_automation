import { useMemo, useState } from 'react'
import type { ChangeType, DifferenceFilters, DifferenceRow } from '@/types/domain'

const ALL_CHANGE_TYPES: ChangeType[] = ['changed', 'added', 'removed', 'error']

export interface UseDifferenceFiltersResult {
  filters: DifferenceFilters
  setQuery: (query: string) => void
  toggleChangeType: (type: ChangeType) => void
  clear: () => void
  filtered: DifferenceRow[]
}

/** Client-side search + change-type filtering over an already-computed difference set. */
export function useDifferenceFilters(rows: DifferenceRow[]): UseDifferenceFiltersResult {
  const [filters, setFilters] = useState<DifferenceFilters>({ query: '', changeTypes: [] })

  const setQuery = (query: string) => setFilters((prev) => ({ ...prev, query }))

  const toggleChangeType = (type: ChangeType) =>
    setFilters((prev) => ({
      ...prev,
      changeTypes: prev.changeTypes.includes(type)
        ? prev.changeTypes.filter((t) => t !== type)
        : [...prev.changeTypes, type],
    }))

  const clear = () => setFilters({ query: '', changeTypes: [] })

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    const activeTypes = filters.changeTypes.length > 0 ? filters.changeTypes : ALL_CHANGE_TYPES
    return rows.filter((row) => {
      if (!activeTypes.includes(row.changeType)) return false
      if (!query) return true
      return (
        row.tagNumber.toLowerCase().includes(query) ||
        row.columnName.toLowerCase().includes(query) ||
        (row.originalValue ?? '').toLowerCase().includes(query) ||
        (row.revisedValue ?? '').toLowerCase().includes(query)
      )
    })
  }, [rows, filters])

  return { filters, setQuery, toggleChangeType, clear, filtered }
}
