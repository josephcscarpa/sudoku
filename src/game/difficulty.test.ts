import { describe, expect, it } from 'vitest'

import { defaultPuzzle } from './defaultGame'
import {
  ratePuzzleDifficulty,
  generatePuzzleForDifficulty,
  DIFFICULTY_PROFILES,
  HEXADOKU_PROFILES,
} from './difficulty'

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

describe('difficulty generation', () => {
  it('uses progressively fewer starting clues', () => {
    expect(DIFFICULTY_PROFILES.easy.clues).toBeGreaterThan(
      DIFFICULTY_PROFILES.medium.clues,
    )
    expect(DIFFICULTY_PROFILES.medium.clues).toBeGreaterThan(
      DIFFICULTY_PROFILES.hard.clues,
    )
    expect(DIFFICULTY_PROFILES.hard.clues).toBeGreaterThan(
      DIFFICULTY_PROFILES.expert.clues,
    )
  })

  it('guarantees Easy puzzles can be completed with naked singles', () => {
    const generated = generatePuzzleForDifficulty('easy', seededRandom(9))

    expect(ratePuzzleDifficulty(generated.puzzle)).toBe('easy')
    expect(generated.puzzle.flat().filter((digit) => digit != null).length).toBeGreaterThanOrEqual(
      DIFFICULTY_PROFILES.easy.clues,
    )
  })

  it('rates a sparse 51-move puzzle as Hard despite simple techniques', () => {
    const sparseSinglesPuzzle = [
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

    expect(ratePuzzleDifficulty(sparseSinglesPuzzle)).toBe('hard')
  })

  it('ships an appropriately gentle first Easy puzzle', () => {
    expect(ratePuzzleDifficulty(defaultPuzzle)).toBe('easy')
  })

  it.each(['medium', 'hard', 'expert'] as const)(
    'generates a puzzle that matches the requested %s tier',
    (difficulty) => {
      const generated = generatePuzzleForDifficulty(
        difficulty,
        seededRandom(21),
      )

      expect(ratePuzzleDifficulty(generated.puzzle)).toBe(difficulty)
    },
  )

  it('generates a 16x16 hexadecimal Sudoku setup', () => {
    const generated = generatePuzzleForDifficulty(
      'easy',
      seededRandom(31),
      4,
    )

    expect(generated.puzzle).toHaveLength(16)
    expect(generated.puzzle.every((row) => row.length === 16)).toBe(true)
    expect(generated.puzzle.flat().filter((digit) => digit != null)).toHaveLength(
      HEXADOKU_PROFILES.easy.clues,
    )
    expect(Math.max(...generated.solution.flat())).toBe(16)
  })
})
