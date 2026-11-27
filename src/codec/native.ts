import type { BoxSize, Coordinate, Digit } from '../../packages/engine/grid'
import type { Difficulty, GameStatus } from '../state/gameStore'

export type NativeCell = Readonly<{
  r: number
  c: number
  value: Digit | null
  candidates: Digit[]
}>

export type NativeGame = Readonly<{
  format: 'sudoku-clone/v1'
  boxSize: BoxSize
  givens: string
  cells: NativeCell[]
  elapsedMs: number
  mistakes: number
  difficulty: Difficulty
  createdAt: string
  status: GameStatus
  selected: Coordinate | null
}>

export function encodeNative(_game: NativeGame): string {
  const game = _game
  return JSON.stringify(
    {
      format: game.format,
      boxSize: game.boxSize,
      givens: game.givens,
      cells: game.cells,
      elapsedMs: game.elapsedMs,
      mistakes: game.mistakes,
      difficulty: game.difficulty,
      createdAt: game.createdAt,
      status: game.status,
      selected: game.selected,
    },
    null,
    2,
  )
}

export function decodeNative(text: string): NativeGame {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid native game JSON')
  }
  if (parsed == null || typeof parsed !== 'object') {
    throw new Error('Invalid native game: expected an object')
  }
  const value = parsed as Record<string, unknown>
  if (value.format !== 'sudoku-clone/v1') {
    throw new Error(`Unsupported native format: ${String(value.format)}`)
  }
  if (![2, 3, 4].includes(value.boxSize as number)) {
    throw new Error('Invalid native game: boxSize must be 2, 3, or 4')
  }
  if (typeof value.givens !== 'string' || !Array.isArray(value.cells)) {
    throw new Error('Invalid native game: givens and cells are required')
  }
  if (
    typeof value.elapsedMs !== 'number' ||
    typeof value.mistakes !== 'number' ||
    typeof value.createdAt !== 'string'
  ) {
    throw new Error('Invalid native game: timer metadata is malformed')
  }
  if (!['easy', 'medium', 'hard', 'expert'].includes(value.difficulty as string)) {
    throw new Error('Invalid native game: difficulty is malformed')
  }
  if (!['playing', 'paused', 'won', 'lost'].includes(value.status as string)) {
    throw new Error('Invalid native game: status is malformed')
  }

  const cells = value.cells.map((cell, index) => {
    if (cell == null || typeof cell !== 'object') {
      throw new Error(`Invalid native game: cell ${index + 1} is malformed`)
    }
    const candidate = cell as Record<string, unknown>
    if (
      !Number.isInteger(candidate.r) ||
      !Number.isInteger(candidate.c) ||
      (candidate.value != null && !Number.isInteger(candidate.value)) ||
      !Array.isArray(candidate.candidates) ||
      !candidate.candidates.every(Number.isInteger)
    ) {
      throw new Error(`Invalid native game: cell ${index + 1} is malformed`)
    }
    return {
      r: candidate.r as number,
      c: candidate.c as number,
      value: candidate.value as Digit | null,
      candidates: candidate.candidates as Digit[],
    }
  })

  const selected = value.selected
  if (
    selected != null &&
    (typeof selected !== 'object' ||
      !Number.isInteger((selected as Record<string, unknown>).r) ||
      !Number.isInteger((selected as Record<string, unknown>).c))
  ) {
    throw new Error('Invalid native game: selected cell is malformed')
  }

  return {
    format: 'sudoku-clone/v1',
    boxSize: value.boxSize as BoxSize,
    givens: value.givens,
    cells,
    elapsedMs: value.elapsedMs,
    mistakes: value.mistakes,
    difficulty: value.difficulty as Difficulty,
    createdAt: value.createdAt,
    status: value.status as GameStatus,
    selected: selected as Coordinate | null,
  }
}
