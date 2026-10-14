/**
 * Domain types for the Excel Comparison Dashboard.
 *
 * These describe the shape of data as it flows from an uploaded workbook,
 * through a comparison run, to the results dashboard. The UI only ever
 * talks to `ComparisonApi` (see `src/api`), so these types are the
 * contract the real FastAPI backend will eventually fulfil too.
 */

/** One of the two workbooks being compared. */
export type WorkbookSlot = 'original' | 'revised'

/** A file the user has dropped/selected, before it is parsed. */
export interface UploadedWorkbook {
  id: string
  fileName: string
  sizeBytes: number
  uploadedAt: string
  /** Worksheet (tab) names discovered in the workbook. */
  sheetNames: string[]
}

/** Status of a single drop zone. */
export type UploadStatus = 'idle' | 'reading' | 'ready' | 'error'

export interface UploadSlotState {
  status: UploadStatus
  workbook: UploadedWorkbook | null
  /** Which sheet the user has selected for comparison. */
  selectedSheet: string | null
  error: string | null
}

/** The column used as the fixed row identifier across both sheets. */
export const TAG_COLUMN_NAME = 'Tag Number' as const

/** User-configurable options for a comparison run. */
export interface ComparisonConfig {
  originalSheet: string
  revisedSheet: string
  /** Column name that uniquely identifies a row; fixed to Tag Number for this tool. */
  tagColumn: string
  /** Columns to ignore even if they differ (e.g. volatile metadata columns). */
  ignoredColumns: string[]
  /** Case/whitespace sensitivity when comparing cell values. */
  trimWhitespace: boolean
  ignoreCase: boolean
}

export type ChangeType = 'changed' | 'added' | 'removed' | 'error'

export interface DifferenceRow {
  id: string
  tagNumber: string
  columnName: string
  originalValue: string | null
  revisedValue: string | null
  changeType: ChangeType
  /** Present when changeType is 'error' — e.g. duplicate tag, missing column. */
  errorMessage?: string
}

export interface ComparisonSummary {
  totalTagsCompared: number
  changedCount: number
  addedCount: number
  removedCount: number
  errorCount: number
  unchangedCount: number
  columnsCompared: number
}

export type ComparisonRunStatus = 'idle' | 'running' | 'success' | 'error'

export interface ComparisonResult {
  id: string
  runAt: string
  config: ComparisonConfig
  summary: ComparisonSummary
  differences: DifferenceRow[]
}

/** Filters applied client-side to the differences table. */
export interface DifferenceFilters {
  query: string
  changeTypes: ChangeType[]
}
