import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buildComparisonReport } from './buildReport'
import type { ComparisonResult } from '@/types/domain'

function makeResult(): ComparisonResult {
  return {
    id: 'run_1',
    runAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    config: {
      originalSheet: 'Original',
      revisedSheet: 'Revised',
      tagColumn: 'Tag Number',
      ignoredColumns: [],
      trimWhitespace: true,
      ignoreCase: false,
    },
    summary: {
      totalTagsCompared: 3,
      changedCount: 1,
      addedCount: 1,
      removedCount: 1,
      errorCount: 0,
      unchangedCount: 0,
      columnsCompared: 1,
    },
    differences: [
      {
        id: 'diff_changed',
        tagNumber: 'PV-1001',
        columnName: 'Status',
        originalValue: 'Approved',
        revisedValue: 'Superseded',
        changeType: 'changed',
      },
      {
        id: 'diff_added',
        tagNumber: 'PV-1003',
        columnName: 'Tag Number',
        originalValue: null,
        revisedValue: 'PV-1003',
        changeType: 'added',
      },
      {
        id: 'diff_removed',
        tagNumber: 'PV-1002',
        columnName: 'Tag Number',
        originalValue: 'PV-1002',
        revisedValue: null,
        changeType: 'removed',
      },
    ],
  }
}

// Regression test for the report/UI data contract: the downloaded report
// must show the same "Added Tag"/"Removed Tag" labeling (and no repeated
// tag-ID values) as the on-screen results table.
describe('buildComparisonReport — report/UI data contract', () => {
  it('labels added/removed rows clearly and omits the repeated tag ID, while keeping changed rows intact', async () => {
    const blob = buildComparisonReport(makeResult())
    const buffer = await blob.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets['Differences']!, { defval: '' })

    const changed = rows.find((r) => r['Tag Number'] === 'PV-1001')
    expect(changed).toMatchObject({ Column: 'Status', 'Original Value': 'Approved', 'Revised Value': 'Superseded' })

    const added = rows.find((r) => r['Tag Number'] === 'PV-1003')
    expect(added).toMatchObject({ Column: 'Added Tag', 'Original Value': '', 'Revised Value': '' })

    const removed = rows.find((r) => r['Tag Number'] === 'PV-1002')
    expect(removed).toMatchObject({ Column: 'Removed Tag', 'Original Value': '', 'Revised Value': '' })
  })
})
