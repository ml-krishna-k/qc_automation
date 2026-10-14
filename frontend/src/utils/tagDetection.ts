/**
 * Detects which column of a worksheet holds the Tag Number, from a set of
 * known header aliases, independent of spacing/punctuation/underscores/case.
 *
 * Mirrors `backend/app/tag_detection.py` so the in-browser engine and the
 * FastAPI backend resolve the same header to the same column.
 */

// Header spellings seen in the wild for the same concept. Compared after
// normalization, so "Tag No.", "TAG_NO", "tag no" all match "TAG NO" here.
const TAG_COLUMN_ALIASES = [
  'TAG NUMBER',
  'TAG NO',
  'TAG NO.',
  'TAG #',
  'TAG',
  'INSTRUMENT TAG',
  'INSTRUMENT TAG NUMBER',
  'INSTRUMENT TAG NO',
  'EQUIPMENT TAG',
  'EQUIPMENT TAG NUMBER',
  'EQUIP TAG',
  'COMPONENT TAG',
  'DEVICE TAG',
  'ITEM TAG',
  'ASSET TAG',
  'ASSET NUMBER',
  'ASSET NO',
]

/** Collapses a header to just its letters/digits, upper-cased, so formatting
 * differences (case, whitespace, underscores, punctuation) never cause a
 * false mismatch. */
export function normalizeHeader(header: string): string {
  return header.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const NORMALIZED_ALIASES = new Set(TAG_COLUMN_ALIASES.map(normalizeHeader))

export interface TagColumnDetection {
  detected: string | null
  candidates: string[]
  isAmbiguous: boolean
}

/** Looks for columns whose normalized header matches a known alias.
 * - Exactly one match -> confidently detected.
 * - More than one match -> ambiguous; caller must ask the user to confirm.
 * - No match -> undetected; caller must ask the user to pick manually. */
export function detectTagColumn(columns: string[]): TagColumnDetection {
  const matches = columns.filter((c) => NORMALIZED_ALIASES.has(normalizeHeader(c)))
  if (matches.length === 1) {
    return { detected: matches[0] ?? null, candidates: matches, isAmbiguous: false }
  }
  if (matches.length > 1) {
    return { detected: null, candidates: matches, isAmbiguous: true }
  }
  return { detected: null, candidates: [], isAmbiguous: false }
}

export class TagColumnNotFoundError extends Error {
  constructor(requested: string) {
    super(
      `No column matching "${requested}" or a known Tag Number alias was found. ` +
        'Please select the tag column manually.',
    )
    this.name = 'TagColumnNotFoundError'
  }
}

export class AmbiguousTagColumnError extends Error {
  candidates: string[]
  constructor(candidates: string[]) {
    super(
      `Multiple possible Tag Number columns found: ${candidates.join(', ')}. ` +
        'Please confirm which one to use.',
    )
    this.name = 'AmbiguousTagColumnError'
    this.candidates = candidates
  }
}

/**
 * Resolves the tag column to use for one worksheet.
 *
 * If `requested` names an actual column, it is used verbatim (this is the
 * common case — the UI sends the fixed "Tag Number" label). Otherwise,
 * alias detection is attempted so headers like "Tag No." or "Instrument Tag"
 * still work without the user having to rename anything.
 */
export function resolveTagColumn(columns: string[], requested: string): string {
  if (columns.includes(requested)) return requested

  const detection = detectTagColumn(columns)
  if (detection.detected) return detection.detected
  if (detection.isAmbiguous) throw new AmbiguousTagColumnError(detection.candidates)
  throw new TagColumnNotFoundError(requested)
}
