import { describe, expect, it } from 'vitest'

import { detectContradictions } from './validate'

describe('detectContradictions', () => {
  it('reports duplicate digits in a unit at L0', () => {
    const grid = [
      [1, 1, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]

    expect(detectContradictions(2, grid, 0)).toContainEqual({
      level: 0,
      kind: 'duplicate',
      digit: 1,
      unit: { kind: 'row', index: 0 },
      cells: [
        { r: 0, c: 0 },
        { r: 0, c: 1 },
      ],
    })
  })

  it('reports an empty cell with no candidate at L1', () => {
    const grid = [
      [1, 2, 3, null],
      [null, null, null, 4],
      [null, null, null, null],
      [null, null, null, null],
    ]

    expect(detectContradictions(2, grid, 1)).toContainEqual({
      level: 1,
      kind: 'dead-cell',
      cell: { r: 0, c: 3 },
    })
  })

  it('reports a digit with no legal home in a unit at L2', () => {
    const grid = [
      [1, null, null, null],
      [null, null, 4, null],
      [null, 4, null, null],
      [null, null, null, null],
    ]

    expect(detectContradictions(2, grid, 2)).toContainEqual({
      level: 2,
      kind: 'missing-home',
      digit: 4,
      unit: { kind: 'row', index: 0 },
    })
  })

  it('reports a solver-proven dead position at L3', () => {
    const grid = [
      [5, 3, 1, null, 7, null, null, null, null],
      [6, null, null, 1, 9, 5, null, null, null],
      [null, 9, 8, null, null, null, null, 6, null],
      [8, null, null, null, 6, null, null, null, 3],
      [4, null, null, 8, null, 3, null, null, 1],
      [7, null, null, null, 2, null, null, null, 6],
      [null, 6, null, null, null, null, 2, 8, null],
      [null, null, null, 4, 1, 9, null, null, 5],
      [null, null, null, null, 8, null, null, 7, 9],
    ]

    expect(detectContradictions(3, grid, 3)).toContainEqual({
      level: 3,
      kind: 'unsolvable',
    })
  })
})
