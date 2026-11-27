import { describe, expect, it } from 'vitest'

import { solveWithSingles } from './techniques'

describe('solveWithSingles', () => {
  it('solves a puzzle using only naked singles', () => {
    const puzzle = [
      [null, 2, 3, 4],
      [3, null, 1, 2],
      [2, 1, null, 3],
      [4, 3, 2, null],
    ]

    expect(solveWithSingles(2, puzzle, { hiddenSingles: false })).toMatchObject({
      solved: true,
      hardestTechnique: 'naked-single',
      placements: 4,
    })
  })

  it('distinguishes hidden-single puzzles from naked-single puzzles', () => {
    const puzzle = [
      [7, null, null, null, 8, 3, null, 5, null],
      [null, 4, 5, null, null, null, null, null, null],
      [null, 2, 8, 4, null, null, null, 6, 7],
      [6, 7, null, null, null, 8, 9, null, null],
      [null, null, 2, null, 4, 6, null, 1, null],
      [8, null, 1, null, 2, null, 7, 4, null],
      [4, null, 9, null, 7, 1, null, 3, 2],
      [null, null, null, 5, 3, 2, null, 9, 4],
      [null, 5, null, 6, 9, null, null, null, null],
    ]

    expect(solveWithSingles(3, puzzle, { hiddenSingles: false }).solved).toBe(
      false,
    )
    expect(solveWithSingles(3, puzzle)).toMatchObject({
      solved: true,
      hardestTechnique: 'hidden-single',
    })
  })

  it('reports when singles are insufficient', () => {
    const empty = Array.from({ length: 4 }, () => Array(4).fill(null))

    expect(solveWithSingles(2, empty)).toMatchObject({
      solved: false,
      hardestTechnique: 'unsolved',
      placements: 0,
    })
  })
})
