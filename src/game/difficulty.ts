import { generatePuzzle } from '../../packages/engine/generator'
import type { GeneratedPuzzle } from '../../packages/engine/generator'
import type { ValueGrid } from '../../packages/engine/grid'
import { solveWithSingles } from '../../packages/engine/techniques'
import type { Difficulty } from '../state/gameStore'

export const DIFFICULTY_PROFILES = {
  easy: { clues: 50, description: 'Naked singles only' },
  medium: { clues: 40, description: 'Naked and hidden singles' },
  hard: { clues: 32, description: 'Advanced logic may be needed' },
  expert: { clues: 26, description: 'Sparse, unrestricted logic' },
} as const satisfies Record<
  Difficulty,
  Readonly<{ clues: number; description: string }>
>

export const HEXADOKU_PROFILES = {
  easy: { clues: 192, description: 'Dense 16×16 introduction' },
  medium: { clues: 176, description: 'Balanced 16×16 puzzle' },
  hard: { clues: 160, description: 'Sparse 16×16 puzzle' },
  expert: { clues: 144, description: 'Very sparse 16×16 puzzle' },
} as const satisfies Record<
  Difficulty,
  Readonly<{ clues: number; description: string }>
>

const EXPERT_CLUE_CEILING = 27

export function ratePuzzleDifficulty(puzzle: ValueGrid): Difficulty {
  const clues = puzzle.flat().filter((digit) => digit != null).length
  if (
    clues >= DIFFICULTY_PROFILES.easy.clues &&
    solveWithSingles(3, puzzle, { hiddenSingles: false }).solved
  ) {
    return 'easy'
  }
  if (
    clues >= DIFFICULTY_PROFILES.medium.clues &&
    solveWithSingles(3, puzzle).solved
  ) {
    return 'medium'
  }

  return clues > EXPERT_CLUE_CEILING ? 'hard' : 'expert'
}

function revealUntilRated(
  generated: GeneratedPuzzle,
  accepted: ReadonlySet<Difficulty>,
  random: () => number,
): Readonly<{ generated: GeneratedPuzzle; rating: Difficulty }> {
  const puzzle = generated.puzzle.map((row) => [...row])
  const emptyPositions = puzzle.flatMap((row, r) =>
    row.flatMap((value, c) => (value == null ? [{ r, c }] : [])),
  )
  for (let index = emptyPositions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[emptyPositions[index], emptyPositions[swapIndex]] = [
      emptyPositions[swapIndex],
      emptyPositions[index],
    ]
  }

  let rating = ratePuzzleDifficulty(puzzle)
  for (const { r, c } of emptyPositions) {
    if (accepted.has(rating)) break
    puzzle[r][c] = generated.solution[r][c]
    rating = ratePuzzleDifficulty(puzzle)
  }

  return { generated: { puzzle, solution: generated.solution }, rating }
}

export function generatePuzzleForDifficulty(
  difficulty: Difficulty,
  random: () => number = Math.random,
  boxSize: 3 | 4 = 3,
): GeneratedPuzzle {
  if (boxSize === 4) {
    return generatePuzzle(4, {
      clues: HEXADOKU_PROFILES[difficulty].clues,
      random,
    })
  }
  const profile = DIFFICULTY_PROFILES[difficulty]
  let fallback: GeneratedPuzzle | null = null

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const generated = generatePuzzle(3, { clues: profile.clues, random })
    if (difficulty === 'easy') {
      return revealUntilRated(generated, new Set(['easy']), random).generated
    }
    if (difficulty === 'medium') {
      const candidate = revealUntilRated(
        generated,
        new Set(['easy', 'medium']),
        random,
      )
      if (candidate.rating === 'medium') return candidate.generated
      fallback = candidate.generated
      continue
    }
    if (ratePuzzleDifficulty(generated.puzzle) === difficulty) {
      return generated
    }
    fallback = generated
  }

  return fallback ?? generatePuzzle(3, { clues: profile.clues, random })
}
