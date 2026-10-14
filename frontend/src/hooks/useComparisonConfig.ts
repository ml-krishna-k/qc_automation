import { useEffect, useMemo, useState } from 'react'
import { comparisonApi } from '@/api'
import { TAG_COLUMN_NAME } from '@/types/domain'
import { resolveTagColumn } from '@/utils/tagDetection'

export interface UseComparisonConfigResult {
  availableColumns: string[]
  ignoredColumns: string[]
  toggleIgnoredColumn: (column: string) => void
  trimWhitespace: boolean
  setTrimWhitespace: (value: boolean) => void
  ignoreCase: boolean
  setIgnoreCase: (value: boolean) => void
  columnsLoading: boolean
}

/** Fetches the columns shared by both selected sheets and tracks the mutable comparison options. */
export function useComparisonConfig(
  originalWorkbookId: string | null,
  originalSheet: string | null,
  revisedWorkbookId: string | null,
  revisedSheet: string | null,
): UseComparisonConfigResult {
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [ignoredColumns, setIgnoredColumns] = useState<string[]>([])
  const [trimWhitespace, setTrimWhitespace] = useState(true)
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [columnsLoading, setColumnsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!originalWorkbookId || !originalSheet || !revisedWorkbookId || !revisedSheet) {
      setAvailableColumns([])
      return
    }
    setColumnsLoading(true)
    Promise.all([
      comparisonApi.getSheetColumns(originalWorkbookId, originalSheet),
      comparisonApi.getSheetColumns(revisedWorkbookId, revisedSheet),
    ])
      .then(([originalCols, revisedCols]) => {
        if (cancelled) return
        // Each sheet may use its own alias for the tag column (e.g. "Tag No."
        // vs "Instrument Tag") — resolve per side so the real tag column is
        // excluded from the "ignore columns" picker under its actual header,
        // not just under the literal "Tag Number" label.
        const safeResolve = (columns: string[]): string | null => {
          try {
            return resolveTagColumn(columns, TAG_COLUMN_NAME)
          } catch {
            return null
          }
        }
        const originalTagColumn = safeResolve(originalCols)
        const revisedTagColumn = safeResolve(revisedCols)
        const shared = originalCols.filter(
          (c) => revisedCols.includes(c) && c !== originalTagColumn && c !== revisedTagColumn,
        )
        setAvailableColumns(shared)
        setIgnoredColumns((prev) => prev.filter((c) => shared.includes(c)))
      })
      .catch(() => {
        if (!cancelled) setAvailableColumns([])
      })
      .finally(() => {
        if (!cancelled) setColumnsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [originalWorkbookId, originalSheet, revisedWorkbookId, revisedSheet])

  const toggleIgnoredColumn = (column: string) =>
    setIgnoredColumns((prev) => (prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]))

  return useMemo(
    () => ({
      availableColumns,
      ignoredColumns,
      toggleIgnoredColumn,
      trimWhitespace,
      setTrimWhitespace,
      ignoreCase,
      setIgnoreCase,
      columnsLoading,
    }),
    [availableColumns, ignoredColumns, trimWhitespace, ignoreCase, columnsLoading],
  )
}
