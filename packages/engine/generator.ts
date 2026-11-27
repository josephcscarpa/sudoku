import { gridSize } from './grid'
import type { BoxSize, CompleteGrid, Digit, ValueGrid } from './grid'
import { countSolutions } from './solver'

export type GeneratedPuzzle = Readonly<{
  puzzle: ValueGrid
  solution: CompleteGrid
}>

export function generateSolution(
  boxSize: BoxSize,
  random: () => number = Math.random,
): CompleteGrid {
  const size = gridSize(boxSize)
  const shuffled = <T>(values: readonly T[]): T[] => {
    const copy = [...values]
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1))
      ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
    }
    return copy
  }
  const groups = Array.from({ length: boxSize }, (_, index) => index)
  const indicesWithinGroups = (groupOrder: number[]): number[] =>
    groupOrder.flatMap((group) =>
      shuffled(groups).map((offset) => group * boxSize + offset),
    )
  const rows = indicesWithinGroups(shuffled(groups))
  const columns = indicesWithinGroups(shuffled(groups))
  const digits = shuffled(
    Array.from({ length: size }, (_, index) => index + 1 as Digit),
  )

  return rows.map((r) =>
    columns.map((c) => {
      const pattern = (r * boxSize + Math.floor(r / boxSize) + c) % size
      return digits[pattern]
    }),
  )
}

export function generatePuzzle(
  boxSize: BoxSize,
  options: Readonly<{ clues: number; random?: () => number }>,
): GeneratedPuzzle {
  const size = gridSize(boxSize)
  const cellCount = size * size
  if (
    !Number.isInteger(options.clues) ||
    options.clues < 1 ||
    options.clues > cellCount
  ) {
    throw new RangeError(`Clue count must be between 1 and ${cellCount}`)
  }

  const random = options.random ?? Math.random
  const solution = generateSolution(boxSize, random)
  const puzzle = solution.map((row) => [...row] as (Digit | null)[])
  const positions = Array.from({ length: cellCount }, (_, index) => index)
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[positions[index], positions[swapIndex]] = [
      positions[swapIndex],
      positions[index],
    ]
  }

  let clues = cellCount
  for (const position of positions) {
    if (clues === options.clues) break
    const r = Math.floor(position / size)
    const c = position % size
    const previous = puzzle[r][c]
    puzzle[r][c] = null
    if (countSolutions(boxSize, puzzle, 2) === 1) {
      clues -= 1
    } else {
      puzzle[r][c] = previous
    }
  }

  return { puzzle, solution }
}
