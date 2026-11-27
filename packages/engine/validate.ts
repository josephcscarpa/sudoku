import { gridSize, legalCandidates } from './grid'
import type { BoxSize, Coordinate, Digit, ValueGrid } from './grid'
import { countSolutions } from './solver'

export type UnitKind = 'row' | 'column' | 'box'
export type UnitRef = Readonly<{ kind: UnitKind; index: number }>
export type Contradiction =
  | Readonly<{
      level: 0
      kind: 'duplicate'
      digit: Digit
      unit: UnitRef
      cells: Coordinate[]
    }>
  | Readonly<{ level: 1; kind: 'dead-cell'; cell: Coordinate }>
  | Readonly<{
      level: 2
      kind: 'missing-home'
      digit: Digit
      unit: UnitRef
    }>
  | Readonly<{ level: 3; kind: 'unsolvable' }>

export function detectContradictions(
  boxSize: BoxSize,
  grid: ValueGrid,
  maxLevel: 0 | 1 | 2 | 3 = 2,
): Contradiction[] {
  const size = gridSize(boxSize)
  const contradictions: Contradiction[] = []
  const units: Array<Readonly<{ ref: UnitRef; cells: Coordinate[] }>> = []

  for (let index = 0; index < size; index += 1) {
    units.push({
      ref: { kind: 'row', index },
      cells: Array.from({ length: size }, (_, c) => ({ r: index, c })),
    })
    units.push({
      ref: { kind: 'column', index },
      cells: Array.from({ length: size }, (_, r) => ({ r, c: index })),
    })
    const boxRow = Math.floor(index / boxSize) * boxSize
    const boxColumn = (index % boxSize) * boxSize
    units.push({
      ref: { kind: 'box', index },
      cells: Array.from({ length: size }, (_, offset) => ({
        r: boxRow + Math.floor(offset / boxSize),
        c: boxColumn + (offset % boxSize),
      })),
    })
  }

  for (const unit of units) {
    const byDigit = new Map<Digit, Coordinate[]>()
    for (const cell of unit.cells) {
      const digit = grid[cell.r]?.[cell.c]
      if (digit != null) {
        const cells = byDigit.get(digit) ?? []
        cells.push(cell)
        byDigit.set(digit, cells)
      }
    }
    for (const [digit, cells] of byDigit) {
      if (cells.length > 1) {
        contradictions.push({
          level: 0,
          kind: 'duplicate',
          digit,
          unit: unit.ref,
          cells,
        })
      }
    }
  }

  if (maxLevel >= 1) {
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (
          grid[r]?.[c] == null &&
          legalCandidates(boxSize, grid, { r, c }).size === 0
        ) {
          contradictions.push({
            level: 1,
            kind: 'dead-cell',
            cell: { r, c },
          })
        }
      }
    }
  }

  if (maxLevel >= 2) {
    const digits = Array.from({ length: size }, (_, index) => index + 1)
    for (const unit of units) {
      const placed = new Set(
        unit.cells
          .map(({ r, c }) => grid[r]?.[c])
          .filter((digit): digit is Digit => digit != null),
      )
      for (const digit of digits) {
        if (placed.has(digit)) continue
        const hasHome = unit.cells.some(
          (cell) =>
            grid[cell.r]?.[cell.c] == null &&
            legalCandidates(boxSize, grid, cell).has(digit),
        )
        if (!hasHome) {
          contradictions.push({
            level: 2,
            kind: 'missing-home',
            digit,
            unit: unit.ref,
          })
        }
      }
    }
  }

  if (maxLevel >= 3 && countSolutions(boxSize, grid, 1) === 0) {
    contradictions.push({ level: 3, kind: 'unsolvable' })
  }

  return contradictions
}
