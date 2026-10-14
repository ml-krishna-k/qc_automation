import * as XLSX from 'xlsx'
import type { ComparisonResult } from '@/types/domain'
import { toDisplayedDifference } from '@/utils/differenceDisplay'

/** Builds a real, downloadable .xlsx report from a comparison result. */
export function buildComparisonReport(result: ComparisonResult): Blob {
  const workbook = XLSX.utils.book_new()

  const summaryRows = [
    { Metric: 'Run date', Value: new Date(result.runAt).toLocaleString() },
    { Metric: 'Original sheet', Value: result.config.originalSheet },
    { Metric: 'Revised sheet', Value: result.config.revisedSheet },
    { Metric: 'Tag column', Value: result.config.tagColumn },
    { Metric: 'Tags compared', Value: result.summary.totalTagsCompared },
    { Metric: 'Columns compared', Value: result.summary.columnsCompared },
    { Metric: 'Changed values', Value: result.summary.changedCount },
    { Metric: 'Added tags', Value: result.summary.addedCount },
    { Metric: 'Removed tags', Value: result.summary.removedCount },
    { Metric: 'Validation errors', Value: result.summary.errorCount },
    { Metric: 'Unchanged tags', Value: result.summary.unchangedCount },
  ]
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary')

  const diffRows = result.differences.map((d) => {
    const display = toDisplayedDifference(d)
    return {
      'Tag Number': d.tagNumber,
      Column: display.columnLabel,
      'Original Value': display.originalDisplay ?? '',
      'Revised Value': display.revisedDisplay ?? '',
      'Change Type': d.changeType,
      Notes: d.errorMessage ?? '',
    }
  })
  const diffSheet = XLSX.utils.json_to_sheet(diffRows)
  diffSheet['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 34 }]
  XLSX.utils.book_append_sheet(workbook, diffSheet, 'Differences')

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
