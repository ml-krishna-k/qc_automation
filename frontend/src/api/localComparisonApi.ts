import type { UploadedWorkbook, WorkbookSlot } from '@/types/domain'
import type * as XLSX from 'xlsx'
import { parseWorkbookFile, readSheetColumns, readSheetRows } from '@/utils/workbook'
import { generateSampleWorkbooks } from '@/utils/sampleData'
import { createId } from '@/utils/id'
import { compareSheets } from './compareEngine'
import { buildComparisonReport } from './buildReport'
import type { ComparisonApi, RunComparisonParams } from './types'
import type { ComparisonResult } from '@/types/domain'

interface StoredWorkbook {
  workbook: XLSX.WorkBook
  fileName: string
}

/** Small artificial delay so async states (spinners, disabled buttons) are visible and testable. */
function settle<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/**
 * Client-side implementation of `ComparisonApi`. It genuinely parses the
 * uploaded workbooks and runs the real diff engine — there is no canned
 * "mock result" here, only a real backend being deferred to later.
 */
export class LocalComparisonApi implements ComparisonApi {
  private workbooks = new Map<string, StoredWorkbook>()

  async uploadWorkbook(file: File, _slot: WorkbookSlot): Promise<UploadedWorkbook> {
    const { sheetNames, workbook } = await parseWorkbookFile(file)
    const id = createId('wb')
    this.workbooks.set(id, { workbook, fileName: file.name })
    return settle<UploadedWorkbook>({
      id,
      fileName: file.name,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      sheetNames,
    })
  }

  async getSheetColumns(workbookId: string, sheetName: string): Promise<string[]> {
    const stored = this.workbooks.get(workbookId)
    if (!stored) throw new Error('Workbook is no longer available. Please re-upload it.')
    return settle(readSheetColumns(stored.workbook, sheetName), 120)
  }

  async runComparison({ originalWorkbookId, revisedWorkbookId, config }: RunComparisonParams): Promise<ComparisonResult> {
    const original = this.workbooks.get(originalWorkbookId)
    const revised = this.workbooks.get(revisedWorkbookId)
    if (!original) throw new Error('Original workbook is no longer available. Please re-upload it.')
    if (!revised) throw new Error('Revised workbook is no longer available. Please re-upload it.')

    const originalRows = readSheetRows(original.workbook, config.originalSheet)
    const revisedRows = readSheetRows(revised.workbook, config.revisedSheet)

    if (originalRows.length === 0) throw new Error(`"${config.originalSheet}" has no data rows.`)
    if (revisedRows.length === 0) throw new Error(`"${config.revisedSheet}" has no data rows.`)

    // compareSheets resolves the actual tag column per sheet (exact match,
    // then alias detection) and throws a descriptive error if it genuinely
    // can't — no need to duplicate that check here.
    const result = compareSheets(originalRows, revisedRows, config)
    return settle(result, 700)
  }

  async buildReport(result: ComparisonResult): Promise<Blob> {
    return settle(buildComparisonReport(result), 250)
  }

  async loadSampleWorkbooks(): Promise<{ original: File; revised: File }> {
    return settle(generateSampleWorkbooks(), 300)
  }
}
