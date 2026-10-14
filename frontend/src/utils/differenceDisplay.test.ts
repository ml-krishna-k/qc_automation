import { describe, expect, it } from 'vitest'
import { toDisplayedDifference } from './differenceDisplay'
import type { DifferenceRow } from '@/types/domain'

function diff(overrides: Partial<DifferenceRow>): DifferenceRow {
  return {
    id: 'diff_1',
    tagNumber: 'PV-1001',
    columnName: 'Tag Number',
    originalValue: null,
    revisedValue: null,
    changeType: 'changed',
    ...overrides,
  }
}

describe('toDisplayedDifference', () => {
  it('labels an added tag clearly, with no misleading original/revised value', () => {
    const display = toDisplayedDifference(
      diff({ changeType: 'added', columnName: 'Tag Number', originalValue: null, revisedValue: 'PV-1003' }),
    )
    expect(display.columnLabel).toBe('Added Tag')
    expect(display.originalDisplay).toBeNull()
    // The tag ID already appears in the row's own Tag Number cell —
    // repeating it in the Revised Value cell is what we're fixing.
    expect(display.revisedDisplay).toBeNull()
  })

  it('labels a removed tag clearly, with no misleading original/revised value', () => {
    const display = toDisplayedDifference(
      diff({ changeType: 'removed', columnName: 'Tag Number', originalValue: 'PV-1002', revisedValue: null }),
    )
    expect(display.columnLabel).toBe('Removed Tag')
    expect(display.originalDisplay).toBeNull()
    expect(display.revisedDisplay).toBeNull()
  })

  it('leaves a changed value row untouched — the real column and both values are meaningful', () => {
    const display = toDisplayedDifference(
      diff({ changeType: 'changed', columnName: 'Status', originalValue: 'Approved', revisedValue: 'Superseded' }),
    )
    expect(display).toEqual({ columnLabel: 'Status', originalDisplay: 'Approved', revisedDisplay: 'Superseded' })
  })

  it('leaves a validation error row untouched', () => {
    const display = toDisplayedDifference(
      diff({ changeType: 'error', columnName: 'Material', originalValue: 'Material', revisedValue: null }),
    )
    expect(display).toEqual({ columnLabel: 'Material', originalDisplay: 'Material', revisedDisplay: null })
  })
})
