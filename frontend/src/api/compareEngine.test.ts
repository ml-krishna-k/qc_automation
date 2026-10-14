import { describe, expect, it } from 'vitest'
import { compareSheets } from './compareEngine'
import { AmbiguousTagColumnError, TagColumnNotFoundError } from '@/utils/tagDetection'
import type { ComparisonConfig } from '@/types/domain'

function config(overrides: Partial<ComparisonConfig> = {}): ComparisonConfig {
  return {
    originalSheet: 'Original',
    revisedSheet: 'Revised',
    tagColumn: 'Tag Number', // the UI always sends this fixed label
    ignoredColumns: [],
    trimWhitespace: true,
    ignoreCase: false,
    ...overrides,
  }
}

describe('compareSheets — tag column resolution (regression)', () => {
  // Reproduces the reported failure: a real-world register whose tag column
  // is headed "Tag No." (a known alias), not the literal "Tag Number" string
  // the UI requests. Previously this threw:
  //   Column "Tag Number" was not found in both worksheets.
  it('resolves the "Tag No." alias instead of requiring an exact "Tag Number" header', () => {
    const original = [
      { 'Tag No.': 'PV-1001', Description: 'Pressure Vessel', Status: 'Approved' },
      { 'Tag No.': 'PV-1002', Description: 'Separator', Status: 'Approved' },
    ]
    const revised = [
      { 'Tag No.': 'PV-1001', Description: 'Pressure Vessel', Status: 'Superseded' },
      { 'Tag No.': 'PV-1003', Description: 'Surge Drum', Status: 'Approved' },
    ]

    const result = compareSheets(original, revised, config())

    expect(result.summary.changedCount).toBe(1)
    expect(result.summary.addedCount).toBe(1)
    expect(result.summary.removedCount).toBe(1)
    expect(result.differences.find((d) => d.tagNumber === 'PV-1001')).toMatchObject({
      columnName: 'Status',
      originalValue: 'Approved',
      revisedValue: 'Superseded',
      changeType: 'changed',
    })
  })

  it('resolves "Instrument Tag" the same way', () => {
    const original = [{ 'Instrument Tag': 'LT-9001', Service: 'Drum Level' }]
    const revised = [{ 'Instrument Tag': 'LT-9001', Service: 'Tank Level' }]

    const result = compareSheets(original, revised, config())

    expect(result.summary.changedCount).toBe(1)
  })

  it('resolves case/whitespace/underscore variants (e.g. "TAG_NUMBER")', () => {
    const original = [{ TAG_NUMBER: 'T-1', Status: 'A' }]
    const revised = [{ TAG_NUMBER: 'T-1', Status: 'B' }]

    const result = compareSheets(original, revised, config())

    expect(result.summary.changedCount).toBe(1)
  })

  it('resolves each sheet independently when they use different aliases for the same concept', () => {
    const original = [{ 'Tag No.': 'T-1', Status: 'A' }]
    const revised = [{ 'Instrument Tag': 'T-1', Status: 'B' }]

    const result = compareSheets(original, revised, config())

    expect(result.summary.changedCount).toBe(1)
    expect(result.differences[0]?.tagNumber).toBe('T-1')
  })

  it('still uses an exact "Tag Number" header verbatim when present (no behavior change for the common case)', () => {
    const original = [{ 'Tag Number': 'T-1', Status: 'A' }]
    const revised = [{ 'Tag Number': 'T-1', Status: 'A' }]

    const result = compareSheets(original, revised, config())

    expect(result.differences).toEqual([])
    expect(result.summary.unchangedCount).toBe(1)
  })

  it('throws a descriptive AmbiguousTagColumnError when more than one alias column exists', () => {
    const rows = [{ 'Asset Tag': 'T-1', 'Equipment Tag': 'x' }]
    expect(() => compareSheets(rows, rows, config())).toThrow(AmbiguousTagColumnError)
  })

  it('throws a descriptive TagColumnNotFoundError when no column resembles a tag column', () => {
    const rows = [{ Description: 'x', Status: 'A' }]
    expect(() => compareSheets(rows, rows, config())).toThrow(TagColumnNotFoundError)
  })

  it('still honors a manually selected tag column that is neither "Tag Number" nor a known alias', () => {
    // If a user ever picks a custom column name, it flows through as
    // `config.tagColumn` and is used verbatim (exact match wins first).
    const original = [{ 'Serial Code': 'S-1', Status: 'A' }]
    const revised = [{ 'Serial Code': 'S-1', Status: 'B' }]

    const result = compareSheets(original, revised, config({ tagColumn: 'Serial Code' }))

    expect(result.summary.changedCount).toBe(1)
  })
})
