import { describe, expect, it } from 'vitest'

import {
  createEmptyGrid,
  digitToSymbol,
  gridSize,
  legalCandidates,
  peersFor,
  symbolToDigit,
  symbolsFor,
  unitsFor,
} from './grid'

describe('gridSize', () => {
  it('derives the board width from the box size', () => {
    expect(gridSize(2)).toBe(4)
    expect(gridSize(3)).toBe(9)
    expect(gridSize(4)).toBe(16)
  })
})

describe('symbol sets', () => {
  it('uses single-character symbols through 16', () => {
    expect(symbolsFor(2)).toEqual(['1', '2', '3', '4'])
    expect(symbolsFor(4)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
    ])
  })

  it('round-trips symbols case-insensitively', () => {
    expect(digitToSymbol(10, 4)).toBe('A')
    expect(symbolToDigit('a', 4)).toBe(10)
    expect(symbolToDigit('G', 4)).toBe(16)
  })

  it('rejects symbols outside the selected board size', () => {
    expect(() => digitToSymbol(5, 2)).toThrow('Digit 5 is outside 1-4')
    expect(() => symbolToDigit('A', 3)).toThrow(
      'Symbol A is not valid for a 9x9 grid',
    )
  })
})

describe('unitsFor', () => {
  it('derives the row, column, and box containing a cell', () => {
    expect(unitsFor(3, { r: 4, c: 5 })).toEqual({
      row: [
        { r: 4, c: 0 },
        { r: 4, c: 1 },
        { r: 4, c: 2 },
        { r: 4, c: 3 },
        { r: 4, c: 4 },
        { r: 4, c: 5 },
        { r: 4, c: 6 },
        { r: 4, c: 7 },
        { r: 4, c: 8 },
      ],
      column: [
        { r: 0, c: 5 },
        { r: 1, c: 5 },
        { r: 2, c: 5 },
        { r: 3, c: 5 },
        { r: 4, c: 5 },
        { r: 5, c: 5 },
        { r: 6, c: 5 },
        { r: 7, c: 5 },
        { r: 8, c: 5 },
      ],
      box: [
        { r: 3, c: 3 },
        { r: 3, c: 4 },
        { r: 3, c: 5 },
        { r: 4, c: 3 },
        { r: 4, c: 4 },
        { r: 4, c: 5 },
        { r: 5, c: 3 },
        { r: 5, c: 4 },
        { r: 5, c: 5 },
      ],
    })
  })
})

describe('peersFor', () => {
  it.each([
    [2, 7],
    [3, 20],
    [4, 39],
  ] as const)('returns unique peers for box size %i', (boxSize, count) => {
    const cell = { r: 1, c: 1 }
    const peers = peersFor(boxSize, cell)

    expect(peers).toHaveLength(count)
    expect(new Set(peers.map(({ r, c }) => `${r}:${c}`))).toHaveLength(count)
    expect(peers).not.toContainEqual(cell)
  })
})

describe('value grids', () => {
  it('creates an independent empty square for the selected size', () => {
    const grid = createEmptyGrid(2)

    expect(grid).toEqual([
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ])
    expect(grid[0]).not.toBe(grid[1])
  })

  it('finds candidates excluded by a cell\'s peers', () => {
    const grid = [
      [1, null, null, 4],
      [null, 4, null, null],
      [null, null, 4, null],
      [4, null, null, null],
    ]

    expect(legalCandidates(2, grid, { r: 0, c: 1 })).toEqual(
      new Set([2, 3]),
    )
    expect(legalCandidates(2, grid, { r: 0, c: 0 })).toEqual(new Set())
  })
})
