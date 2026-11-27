import type {
  Difficulty,
  GameCell,
  GameSnapshot,
  GameState,
  GameStatus,
  MoveRecord,
  RestorableGame,
} from '../state/gameStore'
import type { BoxSize, CompleteGrid, Digit } from '../../packages/engine/grid'

const FORMAT = 'sudoku-clone-game'
const VERSION = 1

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value != null && !Array.isArray(value)
}

function parseStatus(value: unknown): GameStatus {
  if (value === 'playing' || value === 'paused' || value === 'won' || value === 'lost') {
    return value
  }
  throw new Error('Invalid game status')
}

function parseDifficulty(value: unknown): Difficulty {
  if (value === 'easy' || value === 'medium' || value === 'hard' || value === 'expert') {
    return value
  }
  throw new Error('Invalid difficulty')
}

function parseNonnegativeNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${label}`)
  }
  return value
}

function parseDigit(value: unknown, size: number, nullable: true): Digit | null
function parseDigit(value: unknown, size: number, nullable: false): Digit
function parseDigit(
  value: unknown,
  size: number,
  nullable: boolean,
): Digit | null {
  if (nullable && value == null) return null
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > size
  ) {
    throw new Error('Invalid cell digit')
  }
  return value
}

function parseCell(value: unknown, size: number): GameCell {
  if (!isRecord(value) || typeof value.given !== 'boolean' || !Array.isArray(value.notes)) {
    throw new Error('Invalid game cell')
  }
  const notes = value.notes.map((note) => parseDigit(note, size, false))
  if (new Set(notes).size !== notes.length) throw new Error('Invalid candidate list')
  return {
    value: parseDigit(value.value, size, true),
    given: value.given,
    notes,
  }
}

function parseCellGrid(value: unknown, size: number): GameCell[][] {
  if (!Array.isArray(value) || value.length !== size) throw new Error('Invalid cell grid')
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== size) {
      throw new Error(`Invalid cell grid at row ${r + 1}`)
    }
    return row.map((cell, c) => {
      try {
        return parseCell(cell, size)
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Invalid cell'
        throw new Error(`Invalid saved cell at R${r + 1}C${c + 1}: ${reason}`)
      }
    })
  })
}

function parseSolution(value: unknown, size: number): CompleteGrid {
  if (!Array.isArray(value) || value.length !== size) throw new Error('Invalid solution grid')
  return value.map((row) => {
    if (!Array.isArray(row) || row.length !== size) throw new Error('Invalid solution grid')
    return row.map((digit) => parseDigit(digit, size, false))
  })
}

function parseSnapshot(value: unknown, size: number): GameSnapshot {
  if (!isRecord(value)) throw new Error('Invalid move snapshot')
  return {
    cells: parseCellGrid(value.cells, size),
    mistakes: parseNonnegativeNumber(value.mistakes, 'mistake count'),
    status: parseStatus(value.status),
  }
}

function parseMove(value: unknown): MoveRecord {
  if (
    !isRecord(value) ||
    typeof value.notation !== 'string' ||
    typeof value.description !== 'string' ||
    (value.isGuess != null && typeof value.isGuess !== 'boolean')
  ) {
    throw new Error('Invalid move record')
  }
  return {
    notation: value.notation,
    description: value.description,
    ...(value.isGuess === true ? { isGuess: true } : {}),
  }
}

function parseArray<T>(
  value: unknown,
  parser: (entry: unknown) => T,
  label: string,
): T[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label}`)
  return value.map(parser)
}

export function encodeGameExport(
  state: GameState,
  exportedAt = new Date(),
): string {
  return JSON.stringify(
    {
      format: FORMAT,
      version: VERSION,
      exportedAt: exportedAt.toISOString(),
      boxSize: state.boxSize,
      difficulty: state.difficulty,
      cells: state.cells,
      initialCells: state.initialCells,
      solution: state.solution,
      mistakes: state.mistakes,
      elapsedMs: state.elapsedMs,
      status: state.status,
      history: state.history,
      future: state.future,
      moves: state.moves,
      redoMoves: state.redoMoves,
    },
    null,
    2,
  )
}

export function decodeGameExport(text: string): RestorableGame {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('Game data is not valid JSON')
  }
  if (!isRecord(value) || value.format !== FORMAT || value.version !== VERSION) {
    throw new Error('Unsupported Sudoku game data')
  }
  if (value.boxSize !== 2 && value.boxSize !== 3 && value.boxSize !== 4) {
    throw new Error('Invalid board size')
  }
  const boxSize = value.boxSize as BoxSize
  const size = boxSize * boxSize
  const restored: RestorableGame = {
    boxSize,
    difficulty: parseDifficulty(value.difficulty),
    cells: parseCellGrid(value.cells, size),
    initialCells: parseCellGrid(value.initialCells, size),
    solution: parseSolution(value.solution, size),
    mistakes: parseNonnegativeNumber(value.mistakes, 'mistake count'),
    elapsedMs: parseNonnegativeNumber(value.elapsedMs, 'elapsed time'),
    status: parseStatus(value.status),
    history: parseArray(value.history, (entry) => parseSnapshot(entry, size), 'history'),
    future: parseArray(value.future, (entry) => parseSnapshot(entry, size), 'redo history'),
    moves: parseArray(value.moves, parseMove, 'move list'),
    redoMoves: parseArray(value.redoMoves, parseMove, 'redo move list'),
  }
  if (
    restored.history.length !== restored.moves.length ||
    restored.future.length !== restored.redoMoves.length
  ) {
    throw new Error('Move history is inconsistent')
  }
  return restored
}
