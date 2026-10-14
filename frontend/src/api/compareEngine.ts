import type {
  ComparisonConfig,
  ComparisonResult,
  ComparisonSummary,
  DifferenceRow,
} from '@/types/domain'
import type { SheetRows } from '@/utils/workbook'
import { createId } from '@/utils/id'
import { resolveTagColumn } from '@/utils/tagDetection'

/**
 * Pure, synchronous comparison logic. This is the piece a FastAPI backend
 * will eventually own — the API layer calls it so no component ever needs
 * to know how a diff is computed.
 */
export function compareSheets(
  originalRows: SheetRows,
  revisedRows: SheetRows,
  config: ComparisonConfig,
): ComparisonResult {
  // `config.tagColumn` is a requested label (the UI always sends the fixed
  // "Tag Number"), not necessarily the sheet's actual header — each sheet
  // can even use a different alias (e.g. original uses "Tag No.", revised
  // uses "Instrument Tag"). Resolve each side independently; this throws
  // `TagColumnNotFoundError`/`AmbiguousTagColumnError` if it genuinely can't.
  const originalTagColumn = resolveTagColumn(Object.keys(originalRows[0] ?? {}), config.tagColumn)
  const revisedTagColumn = resolveTagColumn(Object.keys(revisedRows[0] ?? {}), config.tagColumn)

  const normalize = (value: string): string => {
    let v = value
    if (config.trimWhitespace) v = v.trim().replace(/\s+/g, ' ')
    if (config.ignoreCase) v = v.toLowerCase()
    return v
  }

  const differences: DifferenceRow[] = []
  const seenTags = new Set<string>()

  const originalByTag = new Map<string, Record<string, string>>()
  const duplicateOriginalTags = new Set<string>()
  for (const row of originalRows) {
    const tag = row[originalTagColumn]?.trim()
    if (!tag) continue
    if (originalByTag.has(tag)) duplicateOriginalTags.add(tag)
    originalByTag.set(tag, row)
  }

  const revisedByTag = new Map<string, Record<string, string>>()
  const duplicateRevisedTags = new Set<string>()
  for (const row of revisedRows) {
    const tag = row[revisedTagColumn]?.trim()
    if (!tag) continue
    if (revisedByTag.has(tag)) duplicateRevisedTags.add(tag)
    revisedByTag.set(tag, row)
  }

  const allColumns = new Set<string>()
  for (const row of originalRows) Object.keys(row).forEach((c) => allColumns.add(c))
  for (const row of revisedRows) Object.keys(row).forEach((c) => allColumns.add(c))
  allColumns.delete(originalTagColumn)
  allColumns.delete(revisedTagColumn)
  for (const col of config.ignoredColumns) allColumns.delete(col)

  const allTags = new Set<string>([...originalByTag.keys(), ...revisedByTag.keys()])

  for (const tag of allTags) {
    seenTags.add(tag)
    const original = originalByTag.get(tag)
    const revised = revisedByTag.get(tag)

    if (duplicateOriginalTags.has(tag) || duplicateRevisedTags.has(tag)) {
      differences.push({
        id: createId('diff'),
        tagNumber: tag,
        columnName: originalTagColumn,
        originalValue: original?.[originalTagColumn] ?? null,
        revisedValue: revised?.[revisedTagColumn] ?? null,
        changeType: 'error',
        errorMessage: 'Duplicate Tag Number found in one or both sheets.',
      })
      continue
    }

    if (!original && revised) {
      differences.push({
        id: createId('diff'),
        tagNumber: tag,
        columnName: revisedTagColumn,
        originalValue: null,
        revisedValue: tag,
        changeType: 'added',
      })
      continue
    }

    if (original && !revised) {
      differences.push({
        id: createId('diff'),
        tagNumber: tag,
        columnName: originalTagColumn,
        originalValue: tag,
        revisedValue: null,
        changeType: 'removed',
      })
      continue
    }

    if (!original || !revised) continue

    for (const column of allColumns) {
      const originalValue = original[column] ?? ''
      const revisedValue = revised[column] ?? ''
      if (normalize(originalValue) !== normalize(revisedValue)) {
        differences.push({
          id: createId('diff'),
          tagNumber: tag,
          columnName: column,
          originalValue: originalValue || null,
          revisedValue: revisedValue || null,
          changeType: 'changed',
        })
      }
    }
  }

  const summary: ComparisonSummary = {
    totalTagsCompared: seenTags.size,
    changedCount: differences.filter((d) => d.changeType === 'changed').length,
    addedCount: differences.filter((d) => d.changeType === 'added').length,
    removedCount: differences.filter((d) => d.changeType === 'removed').length,
    errorCount: differences.filter((d) => d.changeType === 'error').length,
    unchangedCount: Math.max(
      seenTags.size -
        new Set(differences.filter((d) => d.changeType !== 'error').map((d) => d.tagNumber)).size,
      0,
    ),
    columnsCompared: allColumns.size,
  }

  differences.sort((a, b) => a.tagNumber.localeCompare(b.tagNumber) || a.columnName.localeCompare(b.columnName))

  return {
    id: createId('run'),
    runAt: new Date().toISOString(),
    config,
    summary,
    differences,
  }
}
