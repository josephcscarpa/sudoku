import { describe, expect, it } from 'vitest'

import { generatePuzzle, generateSolution } from './generator'
import { countSolutions } from './solver'

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

describe('generateSolution', () => {
  it.each([2, 3, 4] as const)('creates a valid %ix%i solution', (boxSize) => {
    const grid = generateSolution(boxSize, seededRandom(42))
    const size = boxSize * boxSize
    const expected = Array.from({ length: size }, (_, index) => index + 1)

    expect(grid).toHaveLength(size)
    for (const row of grid) {
      expect([...row].sort((a, b) => a - b)).toEqual(expected)
    }
    for (let c = 0; c < size; c += 1) {
      expect(grid.map((row) => row[c]).sort((a, b) => a - b)).toEqual(
        expected,
      )
    }
    expect(countSolutions(boxSize, grid)).toBe(1)
  })
})

describe('generatePuzzle', () => {
  it('carves clues while preserving one solution', () => {
    const generated = generatePuzzle(2, {
      clues: 8,
      random: seededRandom(7),
    })
    const givens = generated.puzzle.flat().filter((value) => value != null)

    expect(givens).toHaveLength(8)
    expect(countSolutions(2, generated.puzzle)).toBe(1)
    generated.puzzle.forEach((row, r) =>
      row.forEach((value, c) => {
        if (value != null) expect(value).toBe(generated.solution[r][c])
      }),
    )
  })

  it('rejects an impossible clue count', () => {
    expect(() => generatePuzzle(2, { clues: 17 })).toThrow(
      'Clue count must be between 1 and 16',
    )
  })
})
