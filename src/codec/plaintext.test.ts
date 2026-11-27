import { describe, expect, it } from 'vitest'

import { parsePlaintext, serializePlaintext } from './plaintext'

describe('plaintext codec', () => {
  it('parses the common single-line 9x9 form', () => {
    const parsed = parsePlaintext(
      '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79',
    )

    expect(parsed.boxSize).toBe(3)
    expect(parsed.grid[0]).toEqual([5, 3, null, null, 7, null, null, null, null])
  })

  it('round-trips a multiline 16x16 grid with A-G symbols', () => {
    const grid = Array.from({ length: 16 }, (_, r) =>
      Array.from({ length: 16 }, (_, c) => ((r * 4 + Math.floor(r / 4) + c) % 16) + 1),
    )
    const encoded = serializePlaintext(4, grid)
    const parsed = parsePlaintext(encoded)

    expect(encoded).toContain('A')
    expect(encoded.split('\n')).toHaveLength(16)
    expect(parsed).toEqual({ boxSize: 4, grid })
  })

  it('reports the exact line and column for invalid input', () => {
    expect(() => parsePlaintext('12X4\n3412\n2143\n4321')).toThrow(
      'Line 1, column 3: X is not valid for a 4x4 grid',
    )
  })

  it('rejects dimensions that are not a square of a square', () => {
    expect(() => parsePlaintext('...\n...\n...')).toThrow(
      'Grid size 3 is not supported; expected 4, 9, or 16',
    )
  })
})
