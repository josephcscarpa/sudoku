import { describe, expect, it } from 'vitest'

import { countSolutions, solve } from './solver'

describe('solve', () => {
  it('solves a 4x4 puzzle without mutating the input', () => {
    const puzzle = [
      [1, null, null, 4],
      [null, 4, 1, null],
      [null, 1, 4, null],
      [4, null, null, 1],
    ]

    expect(solve(2, puzzle)).toEqual([
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ])
    expect(puzzle[0][1]).toBeNull()
  })

  it('solves a standard 9x9 puzzle', () => {
    const puzzle = [
      [5, 3, null, null, 7, null, null, null, null],
      [6, null, null, 1, 9, 5, null, null, null],
      [null, 9, 8, null, null, null, null, 6, null],
      [8, null, null, null, 6, null, null, null, 3],
      [4, null, null, 8, null, 3, null, null, 1],
      [7, null, null, null, 2, null, null, null, 6],
      [null, 6, null, null, null, null, 2, 8, null],
      [null, null, null, 4, 1, 9, null, null, 5],
      [null, null, null, null, 8, null, null, 7, 9],
    ]

    expect(solve(3, puzzle)?.[0]).toEqual([5, 3, 4, 6, 7, 8, 9, 1, 2])
    expect(solve(3, puzzle)?.[8]).toEqual([3, 4, 5, 2, 8, 6, 1, 7, 9])
  })

  it('supports a 16x16 grid without size-specific branches', () => {
    const solution = Array.from({ length: 16 }, (_, r) =>
      Array.from(
        { length: 16 },
        (_, c) => ((r * 4 + Math.floor(r / 4) + c) % 16) + 1,
      ),
    )
    const puzzle = solution.map((row) => [...row])
    puzzle[15][15] = null as never

    expect(solve(4, puzzle)).toEqual(solution)
  })
})

describe('countSolutions', () => {
  it('stops at a caller-provided solution limit', () => {
    const empty = Array.from({ length: 4 }, () => Array(4).fill(null))

    expect(countSolutions(2, empty, 2)).toBe(2)
  })

  it('returns zero for contradictory givens', () => {
    const invalid = [
      [1, 1, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]

    expect(countSolutions(2, invalid)).toBe(0)
    expect(solve(2, invalid)).toBeNull()
  })
})
