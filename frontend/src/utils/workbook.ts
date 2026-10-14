import * as XLSX from 'xlsx'

/** A worksheet reduced to plain string cells, keyed by header name. */
export type SheetRows = Record<string, string>[]

export interface ParsedWorkbook {
  sheetNames: string[]
  workbook: XLSX.WorkBook
}

const SUPPORTED_EXTENSIONS = ['.xlsx', '.xlsm', '.xls']

export function isSupportedWorkbookFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

/** Parses a File into a workbook, listing its sheet names. Throws on corrupt/unreadable files. */
export async function parseWorkbookFile(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  if (workbook.SheetNames.length === 0) {
    throw new Error('This workbook has no worksheets.')
  }
  return { sheetNames: workbook.SheetNames, workbook }
}

/** Reads a sheet as an array of row objects keyed by header (first row). Cell values are stringified. */
export function readSheetRows(workbook: XLSX.WorkBook, sheetName: string): SheetRows {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error(`Worksheet "${sheetName}" was not found.`)

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })

  return raw.map((row) => {
    const cleaned: Record<string, string> = {}
    for (const [key, value] of Object.entries(row)) {
      cleaned[key.trim()] = value === null || value === undefined ? '' : String(value).trim()
    }
    return cleaned
  })
}

/** Column headers present in a sheet, in file order. */
export function readSheetColumns(workbook: XLSX.WorkBook, sheetName: string): string[] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1')
  const columns: string[] = []
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
    const cell = sheet[cellAddress]
    const header = cell?.v
    if (header !== undefined && header !== null && String(header).trim() !== '') {
      columns.push(String(header).trim())
    }
  }
  return columns
}
