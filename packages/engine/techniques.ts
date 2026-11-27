import { gridSize, legalCandidates } from './grid'
import type { BoxSize, Coordinate, Digit, ValueGrid } from './grid'

export type SinglesTechnique =
  | 'none'
  | 'naked-single'
  | 'hidden-single'
  | 'unsolved'

export type SinglesResult = Readonly<{
  solved: boolean
  hardestTechnique: SinglesTechnique
  placements: number
}>

function allUnits(boxSize: BoxSize): Coordinate[][] {
  const size = gridSize(boxSize)
  const units: Coordinate[][] = []
  for (let index = 0; index < size; index += 1) {
    units.push(Array.from({ length: size }, (_, c) => ({ r: index, c })))
    units.push(Array.from({ length: size }, (_, r) => ({ r, c: index })))
    const boxRow = Math.floor(index / boxSize) * boxSize
    const boxColumn = (index % boxSize) * boxSize
    units.push(
      Array.from({ length: size }, (_, offset) => ({
        r: boxRow + Math.floor(offset / boxSize),
        c: boxColumn + (offset % boxSize),
      })),
    )
  }
  return units
}

export function solveWithSingles(
  boxSize: BoxSize,
  puzzle: ValueGrid,
  options: Readonly<{ hiddenSingles?: boolean }> = {},
): SinglesResult {
  const size = gridSize(boxSize)
  const grid = puzzle.map((row) => [...row])
  const allowHidden = options.hiddenSingles ?? true
  let placements = 0
  let usedHiddenSingle = false

  while (true) {
    let emptyCount = 0
    let nakedMove: Readonly<{ cell: Coordinate; digit: Digit }> | null = null

    for (let r = 0; r < size && nakedMove == null; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (grid[r]?.[c] != null) continue
        emptyCount += 1
        const candidates = legalCandidates(boxSize, grid, { r, c })
        if (candidates.size === 1) {
          nakedMove = { cell: { r, c }, digit: [...candidates][0] }
          break
        }
      }
    }

    if (emptyCount === 0) {
      return {
        solved: true,
        hardestTechnique: usedHiddenSingle
          ? 'hidden-single'
          : placements > 0
            ? 'naked-single'
            : 'none',
        placements,
      }
    }

    if (nakedMove != null) {
      grid[nakedMove.cell.r][nakedMove.cell.c] = nakedMove.digit
      placements += 1
      continue
    }

    if (allowHidden) {
      let hiddenMove: Readonly<{ cell: Coordinate; digit: Digit }> | null = null
      for (const unit of allUnits(boxSize)) {
        const placed = new Set(unit.map(({ r, c }) => grid[r][c]))
        for (let digit = 1; digit <= size; digit += 1) {
          if (placed.has(digit)) continue
          const homes = unit.filter(
            (cell) =>
              grid[cell.r][cell.c] == null &&
              legalCandidates(boxSize, grid, cell).has(digit),
          )
          if (homes.length === 1) {
            hiddenMove = { cell: homes[0], digit }
            break
          }
        }
        if (hiddenMove != null) break
      }

      if (hiddenMove != null) {
        grid[hiddenMove.cell.r][hiddenMove.cell.c] = hiddenMove.digit
        placements += 1
        usedHiddenSingle = true
        continue
      }
    }

    return { solved: false, hardestTechnique: 'unsolved', placements }
  }
}
