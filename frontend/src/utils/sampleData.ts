import * as XLSX from 'xlsx'

/**
 * Builds two real, valid .xlsx files in memory so the "Load sample files"
 * action exercises the exact same parse → configure → compare pipeline as
 * a user-provided upload. Nothing here is a canned "result" — the sample
 * files still go through real parsing and the real diff engine.
 */
const COLUMNS = ['Tag Number', 'Description', 'Service', 'Size', 'Material', 'P&ID No', 'Status'] as const

const BASE_ROWS: Record<(typeof COLUMNS)[number], string>[] = [
  { 'Tag Number': 'PV-1001', Description: 'Pressure Vessel - Knockout Drum', Service: 'Flare KO Drum', Size: '48"', Material: 'SA-516-70', 'P&ID No': 'PID-100-01', Status: 'Approved' },
  { 'Tag Number': 'PV-1002', Description: 'Pressure Vessel - Separator', Service: 'Two-Phase Sep', Size: '36"', Material: 'SA-516-70', 'P&ID No': 'PID-100-02', Status: 'Approved' },
  { 'Tag Number': 'HX-2001', Description: 'Shell & Tube Exchanger', Service: 'Feed/Effluent', Size: 'TEMA AES', Material: 'SS316', 'P&ID No': 'PID-200-01', Status: 'Approved' },
  { 'Tag Number': 'HX-2002', Description: 'Air Cooled Exchanger', Service: 'Overhead Cond.', Size: '4-Bay', Material: 'CS', 'P&ID No': 'PID-200-02', Status: 'Approved' },
  { 'Tag Number': 'P-3001A', Description: 'Centrifugal Pump', Service: 'Feed Pump A', Size: '6x8-11', Material: 'CS', 'P&ID No': 'PID-300-01', Status: 'Approved' },
  { 'Tag Number': 'P-3001B', Description: 'Centrifugal Pump', Service: 'Feed Pump B', Size: '6x8-11', Material: 'CS', 'P&ID No': 'PID-300-01', Status: 'Approved' },
  { 'Tag Number': 'C-4001', Description: 'Reciprocating Compressor', Service: 'Fuel Gas', Size: '2-Stage', Material: 'CS', 'P&ID No': 'PID-400-01', Status: 'Approved' },
  { 'Tag Number': 'T-5001', Description: 'Distillation Column', Service: 'Debutanizer', Size: '72" ID', Material: 'SS304', 'P&ID No': 'PID-500-01', Status: 'Approved' },
  { 'Tag Number': 'T-5002', Description: 'Storage Tank', Service: 'Slop Oil', Size: '20,000 bbl', Material: 'CS', 'P&ID No': 'PID-500-02', Status: 'Approved' },
  { 'Tag Number': 'FV-6001', Description: 'Control Valve', Service: 'Level Control', Size: '4"', Material: 'CS/SS Trim', 'P&ID No': 'PID-600-01', Status: 'Approved' },
  { 'Tag Number': 'FV-6002', Description: 'Control Valve', Service: 'Flow Control', Size: '6"', Material: 'CS/SS Trim', 'P&ID No': 'PID-600-02', Status: 'Approved' },
  { 'Tag Number': 'PSV-7001', Description: 'Pressure Safety Valve', Service: 'Overpressure Protection', Size: '3x4', Material: 'CS', 'P&ID No': 'PID-700-01', Status: 'Approved' },
  { 'Tag Number': 'PSV-7002', Description: 'Pressure Safety Valve', Service: 'Overpressure Protection', Size: '2x3', Material: 'CS', 'P&ID No': 'PID-700-02', Status: 'Approved' },
  { 'Tag Number': 'XV-8001', Description: 'Emergency Shutdown Valve', Service: 'ESD Isolation', Size: '8"', Material: 'CS', 'P&ID No': 'PID-800-01', Status: 'Approved' },
  { 'Tag Number': 'LT-9001', Description: 'Level Transmitter', Service: 'Drum Level', Size: 'N/A', Material: 'SS316', 'P&ID No': 'PID-100-01', Status: 'Approved' },
  { 'Tag Number': 'LT-9002', Description: 'Level Transmitter', Service: 'Tank Level', Size: 'N/A', Material: 'SS316', 'P&ID No': 'PID-500-02', Status: 'Approved' },
  { 'Tag Number': 'PT-9101', Description: 'Pressure Transmitter', Service: 'Vessel Pressure', Size: 'N/A', Material: 'SS316', 'P&ID No': 'PID-100-01', Status: 'Approved' },
  { 'Tag Number': 'TT-9201', Description: 'Temperature Transmitter', Service: 'Exchanger Outlet', Size: 'N/A', Material: 'SS316', 'P&ID No': 'PID-200-01', Status: 'Approved' },
  { 'Tag Number': 'FT-9301', Description: 'Flow Transmitter', Service: 'Feed Flow', Size: '6"', Material: 'SS316', 'P&ID No': 'PID-300-01', Status: 'Approved' },
  { 'Tag Number': 'AI-9401', Description: 'Analyzer - O2', Service: 'Stack Gas', Size: 'N/A', Material: 'SS316', 'P&ID No': 'PID-400-01', Status: 'Approved' },
]

function toSheet(rows: Record<string, string>[]): XLSX.WorkSheet {
  return XLSX.utils.json_to_sheet(rows, { header: [...COLUMNS] })
}

function toFile(workbook: XLSX.WorkBook, fileName: string): File {
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new File([buffer], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function generateSampleWorkbooks(): { original: File; revised: File } {
  const originalRows = BASE_ROWS.map((r) => ({ ...r }))
  const originalWorkbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(originalWorkbook, toSheet(originalRows), 'Tag Register')
  XLSX.utils.book_append_sheet(originalWorkbook, toSheet([]), 'Revision Log')

  const revisedRows = originalRows.map((r) => ({ ...r }))

  // Changed values across a few columns.
  revisedRows[1] = { ...revisedRows[1]!, Size: '42"', Status: 'Under Review' }
  revisedRows[3] = { ...revisedRows[3]!, Material: 'SS304' }
  revisedRows[7] = { ...revisedRows[7]!, Description: 'Distillation Column - Revamped Trays' }
  revisedRows[10] = { ...revisedRows[10]!, Size: '8"', Service: 'Flow Control - Upsized' }
  revisedRows[14] = { ...revisedRows[14]!, Status: 'Superseded' }

  // Removed tags (present only in original).
  const removed = new Set(['C-4001', 'AI-9401'])
  const withRemovals = revisedRows.filter((r) => !removed.has(r['Tag Number']))

  // Added tags (new in revision).
  const added: Record<string, string>[] = [
    { 'Tag Number': 'PV-1003', Description: 'Pressure Vessel - Surge Drum', Service: 'Surge Protection', Size: '30"', Material: 'SA-516-70', 'P&ID No': 'PID-100-03', Status: 'Approved' },
    { 'Tag Number': 'HX-2003', Description: 'Plate Exchanger', Service: 'Trim Cooling', Size: 'Plate Pack', Material: 'SS316', 'P&ID No': 'PID-200-03', Status: 'Approved' },
  ]

  // Duplicate tag (data quality error) deliberately introduced in revision.
  const duplicate = { ...withRemovals[4]!, Description: 'Duplicate entry - verify source' }

  const finalRevised = [...withRemovals, ...added, duplicate]

  const revisedWorkbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(revisedWorkbook, toSheet(finalRevised), 'Tag Register')
  XLSX.utils.book_append_sheet(revisedWorkbook, toSheet([]), 'Revision Log')

  return {
    original: toFile(originalWorkbook, 'Tag-Register-Rev0.xlsx'),
    revised: toFile(revisedWorkbook, 'Tag-Register-Rev1.xlsx'),
  }
}
