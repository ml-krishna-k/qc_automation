import type { ComparisonConfig, ComparisonResult, UploadedWorkbook, WorkbookSlot } from '@/types/domain'

export interface RunComparisonParams {
  originalWorkbookId: string
  revisedWorkbookId: string
  config: ComparisonConfig
}

/**
 * The contract the UI depends on. Today `LocalComparisonApi` fulfils it by
 * parsing workbooks in the browser; swapping in `HttpComparisonApi` (same
 * shape, backed by FastAPI) is the only change needed later — no component
 * touches this interface's implementation directly.
 */
export interface ComparisonApi {
  uploadWorkbook(file: File, slot: WorkbookSlot): Promise<UploadedWorkbook>
  /** Column headers for a sheet, used to populate the "ignore these columns" picker. */
  getSheetColumns(workbookId: string, sheetName: string): Promise<string[]>
  runComparison(params: RunComparisonParams): Promise<ComparisonResult>
  buildReport(result: ComparisonResult): Promise<Blob>
  loadSampleWorkbooks(): Promise<{ original: File; revised: File }>
}
