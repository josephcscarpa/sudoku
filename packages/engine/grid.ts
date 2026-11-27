export type BoxSize = 2 | 3 | 4
export type Digit = number
export type Coordinate = Readonly<{ r: number; c: number }>
export type ValueGrid = ReadonlyArray<ReadonlyArray<Digit | null>>
export type CompleteGrid = ReadonlyArray<ReadonlyArray<Digit>>
export type Units = Readonly<{
  row: Coordinate[]
  column: Coordinate[]
  box: Coordinate[]
}>

const SYMBOLS = [
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
] as const

export function gridSize(boxSize: BoxSize): number {
  return boxSize * boxSize
}

export function symbolsFor(boxSize: BoxSize): string[] {
  return SYMBOLS.slice(0, gridSize(boxSize))
}

export function digitToSymbol(digit: Digit, boxSize: BoxSize): string {
  const size = gridSize(boxSize)
  if (!Number.isInteger(digit) || digit < 1 || digit > size) {
    throw new RangeError(`Digit ${digit} is outside 1-${size}`)
  }

  return SYMBOLS[digit - 1]
}

export function symbolToDigit(symbol: string, boxSize: BoxSize): Digit {
  const normalized = symbol.toUpperCase()
  const digit = SYMBOLS.indexOf(normalized as (typeof SYMBOLS)[number]) + 1
  const size = gridSize(boxSize)
  if (digit < 1 || digit > size) {
    throw new RangeError(
      `Symbol ${symbol} is not valid for a ${size}x${size} grid`,
    )
  }

  return digit
}

export function unitsFor(boxSize: BoxSize, cell: Coordinate): Units {
  const size = gridSize(boxSize)
  const row = Array.from({ length: size }, (_, c) => ({ r: cell.r, c }))
  const column = Array.from({ length: size }, (_, r) => ({ r, c: cell.c }))
  const boxStartRow = Math.floor(cell.r / boxSize) * boxSize
  const boxStartColumn = Math.floor(cell.c / boxSize) * boxSize
  const box = Array.from({ length: size }, (_, index) => ({
    r: boxStartRow + Math.floor(index / boxSize),
    c: boxStartColumn + (index % boxSize),
  }))

  return { row, column, box }
}

export function peersFor(
  boxSize: BoxSize,
  cell: Coordinate,
): Coordinate[] {
  const peers = new Map<string, Coordinate>()
  const { row, column, box } = unitsFor(boxSize, cell)
  for (const peer of [...row, ...column, ...box]) {
    if (peer.r !== cell.r || peer.c !== cell.c) {
      peers.set(`${peer.r}:${peer.c}`, peer)
    }
  }

  return [...peers.values()]
}

export function createEmptyGrid(boxSize: BoxSize): (Digit | null)[][] {
  const size = gridSize(boxSize)
  return Array.from({ length: size }, () => Array(size).fill(null))
}

export function legalCandidates(
  boxSize: BoxSize,
  grid: ValueGrid,
  cell: Coordinate,
): Set<Digit> {
  if (grid[cell.r]?.[cell.c] != null) {
    return new Set()
  }

  const excluded = new Set(
    peersFor(boxSize, cell)
      .map(({ r, c }) => grid[r]?.[c])
      .filter((digit): digit is Digit => digit != null),
  )
  const size = gridSize(boxSize)

  return new Set(
    Array.from({ length: size }, (_, index) => index + 1).filter(
      (digit) => !excluded.has(digit),
    ),
  )
}
