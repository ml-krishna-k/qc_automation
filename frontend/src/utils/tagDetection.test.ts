import { describe, expect, it } from 'vitest'
import {
  AmbiguousTagColumnError,
  TagColumnNotFoundError,
  detectTagColumn,
  normalizeHeader,
  resolveTagColumn,
} from './tagDetection'

describe('normalizeHeader', () => {
  it('collapses case, whitespace, underscores and punctuation', () => {
    expect(normalizeHeader('Tag No.')).toBe(normalizeHeader('TAG_NO'))
    expect(normalizeHeader('Tag No.')).toBe(normalizeHeader('tag no'))
    expect(normalizeHeader('Instrument Tag')).toBe(normalizeHeader('INSTRUMENT_TAG'))
  })
})

describe('detectTagColumn', () => {
  it('detects a single alias match', () => {
    const detection = detectTagColumn(['Description', 'Tag No.', 'Status'])
    expect(detection.detected).toBe('Tag No.')
    expect(detection.isAmbiguous).toBe(false)
  })

  it('reports no match when nothing resembles a tag column', () => {
    const detection = detectTagColumn(['Description', 'Status'])
    expect(detection.detected).toBeNull()
    expect(detection.candidates).toEqual([])
  })

  it('reports ambiguity when multiple alias columns are present', () => {
    const detection = detectTagColumn(['Asset Tag', 'Equipment Tag', 'Description'])
    expect(detection.detected).toBeNull()
    expect(detection.isAmbiguous).toBe(true)
    expect(new Set(detection.candidates)).toEqual(new Set(['Asset Tag', 'Equipment Tag']))
  })
})

describe('resolveTagColumn', () => {
  it('prefers an exact match for the requested name', () => {
    expect(resolveTagColumn(['Tag Number', 'Tag No.'], 'Tag Number')).toBe('Tag Number')
  })

  it('falls back to alias detection when the requested name is not a literal header', () => {
    expect(resolveTagColumn(['Tag No.', 'Description'], 'Tag Number')).toBe('Tag No.')
    expect(resolveTagColumn(['Instrument Tag', 'Status'], 'Tag Number')).toBe('Instrument Tag')
    expect(resolveTagColumn(['TAG_NUMBER', 'Status'], 'Tag Number')).toBe('TAG_NUMBER')
  })

  it('throws AmbiguousTagColumnError when more than one alias column exists', () => {
    expect(() => resolveTagColumn(['Asset Tag', 'Equipment Tag'], 'Tag Number')).toThrow(AmbiguousTagColumnError)
  })

  it('throws TagColumnNotFoundError when nothing matches', () => {
    expect(() => resolveTagColumn(['Description', 'Status'], 'Tag Number')).toThrow(TagColumnNotFoundError)
  })
})
