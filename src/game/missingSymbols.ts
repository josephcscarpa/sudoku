import type {
  BoxSize,
  Coordinate,
  Digit,
  ValueGrid,
} from '../../packages/engine/grid'

export type UnitKind = 'row' | 'column' | 'box'
export type UnitInspection = Readonly<{
  kind: UnitKind
  index: number
}>

export function missingDigitsForUnit(
  boxSize: BoxSize,
  grid: ValueGrid,
  inspection: UnitInspection,
): Digit[] {
  const size = boxSize * boxSize
  const present = new Set<Digit>()

  if (inspection.kind === 'row') {
    for (const digit of grid[inspection.index] ?? []) {
      if (digit != null) present.add(digit)
    }
  } else if (inspection.kind === 'column') {
    for (const row of grid) {
      const digit = row[inspection.index]
      if (digit != null) present.add(digit)
    }
  } else {
    const boxRow = Math.floor(inspection.index / boxSize)
    const boxColumn = inspection.index % boxSize
    const startRow = boxRow * boxSize
    const startColumn = boxColumn * boxSize
    for (let r = startRow; r < startRow + boxSize; r += 1) {
      for (let c = startColumn; c < startColumn + boxSize; c += 1) {
        const digit = grid[r]?.[c]
        if (digit != null) present.add(digit)
      }
    }
  }

  return Array.from({ length: size }, (_, index) => index + 1).filter(
    (digit) => !present.has(digit),
  )
}

export function inspectionContainsCell(
  boxSize: BoxSize,
  inspection: UnitInspection,
  cell: Coordinate,
): boolean {
  if (inspection.kind === 'row') return cell.r === inspection.index
  if (inspection.kind === 'column') return cell.c === inspection.index
  return (
    Math.floor(cell.r / boxSize) * boxSize +
      Math.floor(cell.c / boxSize) ===
    inspection.index
  )
}

export function inspectionLabel(inspection: UnitInspection): string {
  const kind = inspection.kind === 'column' ? 'column' : inspection.kind
  return `${kind} ${inspection.index + 1}`
}
