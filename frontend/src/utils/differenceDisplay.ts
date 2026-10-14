import type { DifferenceRow } from '@/types/domain'

/**
 * Maps a raw `DifferenceRow` (as produced by the comparison engine, frontend
 * or backend) to display-ready text. This is presentation-only: it does not
 * change what the engine computes, only how an added/removed tag is labeled
 * and which value cells are shown.
 *
 * For a `changed` value, the actual column and both values are meaningful
 * and are shown as-is. For `added`/`removed`, the engine's underlying
 * representation reuses the tag column (e.g. "Tag Number") with the tag ID
 * as the value — accurate, but when rendered next to the row's own Tag
 * Number cell it reads as a duplicated, confusing "value change". Shared by
 * the results table and both report builders (frontend + backend) so the
 * on-screen table and the downloaded report always agree.
 */
export interface DisplayedDifference {
  columnLabel: string
  originalDisplay: string | null
  revisedDisplay: string | null
}

export function toDisplayedDifference(diff: DifferenceRow): DisplayedDifference {
  if (diff.changeType === 'added') {
    return { columnLabel: 'Added Tag', originalDisplay: null, revisedDisplay: null }
  }
  if (diff.changeType === 'removed') {
    return { columnLabel: 'Removed Tag', originalDisplay: null, revisedDisplay: null }
  }
  // 'changed' and 'error' rows already carry a meaningful column/value pair.
  return { columnLabel: diff.columnName, originalDisplay: diff.originalValue, revisedDisplay: diff.revisedValue }
}
