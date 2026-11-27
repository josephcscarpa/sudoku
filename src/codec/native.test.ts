import { describe, expect, it } from 'vitest'

import { decodeNative, encodeNative } from './native'
import type { NativeGame } from './native'

const game: NativeGame = {
  format: 'sudoku-clone/v1',
  boxSize: 2,
  givens: '..34341221434321',
  cells: [
    { r: 0, c: 0, value: 1, candidates: [] },
    { r: 0, c: 1, value: null, candidates: [2, 3] },
  ],
  elapsedMs: 74_000,
  mistakes: 1,
  difficulty: 'hard',
  createdAt: '2026-08-06T00:00:00.000Z',
  status: 'playing',
  selected: { r: 0, c: 1 },
}

describe('native codec', () => {
  it('round-trips byte-identically', () => {
    const encoded = encodeNative(game)

    expect(decodeNative(encoded)).toEqual(game)
    expect(encodeNative(decodeNative(encoded))).toBe(encoded)
  })

  it('rejects unknown native versions specifically', () => {
    expect(() =>
      decodeNative('{"format":"sudoku-clone/v99"}'),
    ).toThrow('Unsupported native format: sudoku-clone/v99')
  })

  it('reports malformed JSON as an invalid native game', () => {
    expect(() => decodeNative('{oops')).toThrow('Invalid native game JSON')
  })
})
