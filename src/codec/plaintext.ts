import {
  digitToSymbol,
  gridSize,
  symbolToDigit,
} from '../../packages/engine/grid'
import type { BoxSize, ValueGrid } from '../../packages/engine/grid'

export type ParsedPlaintext = Readonly<{
  boxSize: BoxSize
  grid: ValueGrid
}>

export function parsePlaintext(text: string): ParsedPlaintext {
  const inputLines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (inputLines.length === 0) {
    throw new Error('The puzzle is empty')
  }

  const singleLine = inputLines.length === 1
  const size = singleLine
    ? Math.sqrt(inputLines[0].length)
    : inputLines.length
  if (!Number.isInteger(size) || ![4, 9, 16].includes(size)) {
    const label = Number.isInteger(size) ? size : inputLines[0].length
    throw new Error(
      `Grid size ${label} is not supported; expected 4, 9, or 16`,
    )
  }

  const lines = singleLine
    ? Array.from({ length: size }, (_, index) =>
        inputLines[0].slice(index * size, (index + 1) * size),
      )
    : inputLines
  const boxSize = Math.sqrt(size) as BoxSize

  return {
    boxSize,
    grid: lines.map((line, r) => {
      if (line.length !== size) {
        throw new Error(
          `Line ${r + 1} has ${line.length} characters; expected ${size}`,
        )
      }
      return [...line].map((symbol, c) => {
        if (symbol === '.' || symbol === '0') return null
        try {
          return symbolToDigit(symbol, boxSize)
        } catch {
          throw new Error(
            `Line ${r + 1}, column ${c + 1}: ${symbol} is not valid for a ${size}x${size} grid`,
          )
        }
      })
    }),
  }
}

export function serializePlaintext(
  boxSize: BoxSize,
  grid: ValueGrid,
): string {
  const size = gridSize(boxSize)
  if (grid.length !== size || grid.some((row) => row.length !== size)) {
    throw new Error(`Expected a ${size}x${size} grid`)
  }
  return grid
    .map((row) =>
      row
        .map((digit) => (digit == null ? '.' : digitToSymbol(digit, boxSize)))
        .join(''),
    )
    .join('\n')
}
