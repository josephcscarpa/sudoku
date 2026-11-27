import { createStore } from 'zustand/vanilla'

import { digitToSymbol, peersFor } from '../../packages/engine/grid'
import type {
  BoxSize,
  CompleteGrid,
  Coordinate,
  Digit,
  ValueGrid,
} from '../../packages/engine/grid'
import { getActiveUiSettings } from '../game/uiSettings'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type GameStatus = 'playing' | 'paused' | 'won' | 'lost'

export type GameCell = Readonly<{
  value: Digit | null
  given: boolean
  notes: Digit[]
}>

export type GameSetup = Readonly<{
  boxSize: BoxSize
  puzzle: ValueGrid
  solution: CompleteGrid
  difficulty?: Difficulty
}>

export type GameSnapshot = Readonly<{
  cells: GameCell[][]
  mistakes: number
  status: GameStatus
}>

export type MoveRecord = Readonly<{
  notation: string
  description: string
  isGuess?: boolean
}>

export type ContradictionFeedback = Readonly<{
  id: number
  attemptedCell: Coordinate
  conflictingCells: Coordinate[]
  digit: Digit
  message: string
}>

export type RestorableGame = Readonly<{
  boxSize: BoxSize
  difficulty: Difficulty
  cells: GameCell[][]
  initialCells: GameCell[][]
  solution: CompleteGrid
  mistakes: number
  elapsedMs: number
  status: GameStatus
  history: GameSnapshot[]
  future: GameSnapshot[]
  moves: MoveRecord[]
  redoMoves: MoveRecord[]
}>

export type GameState = Readonly<{
  boxSize: BoxSize
  difficulty: Difficulty
  cells: GameCell[][]
  initialCells: GameCell[][]
  solution: CompleteGrid
  selected: Coordinate | null
  notesMode: boolean
  mistakes: number
  elapsedMs: number
  status: GameStatus
  history: GameSnapshot[]
  future: GameSnapshot[]
  moves: MoveRecord[]
  redoMoves: MoveRecord[]
  contradiction: ContradictionFeedback | null
  selectCell: (cell: Coordinate) => void
  deselect: () => void
  inputDigit: (digit: Digit) => void
  toggleCandidate: (cell: Coordinate, digit: Digit) => void
  toggleNotesMode: () => void
  erase: () => void
  clearCell: (cell: Coordinate) => void
  undo: () => void
  redo: () => void
  toggleGuess: (moveIndex: number) => void
  returnToGuess: (moveIndex: number) => void
  hint: () => void
  restart: () => void
  loadGame: (setup: GameSetup) => void
  restoreGame: (game: RestorableGame) => void
  tick: (milliseconds?: number) => void
  togglePause: () => void
  clearContradiction: () => void
}>

function contradictionMessage(
  boxSize: BoxSize,
  attemptedCell: Coordinate,
  conflictingCell: Coordinate,
  digit: Digit,
): string {
  const symbol = digitToSymbol(digit, boxSize)
  const location = `R${conflictingCell.r + 1}C${conflictingCell.c + 1}`
  if (attemptedCell.r === conflictingCell.r) {
    return `${symbol} already appears in row ${attemptedCell.r + 1} at ${location}.`
  }
  if (attemptedCell.c === conflictingCell.c) {
    return `${symbol} already appears in column ${attemptedCell.c + 1} at ${location}.`
  }
  const boxRow = Math.floor(attemptedCell.r / boxSize) + 1
  const boxColumn = Math.floor(attemptedCell.c / boxSize) + 1
  return `${symbol} already appears in box ${boxRow},${boxColumn} at ${location}.`
}

function cloneCells(cells: GameCell[][]): GameCell[][] {
  return cells.map((row) =>
    row.map((cell) => ({ ...cell, notes: [...cell.notes] })),
  )
}

function cellsFromPuzzle(puzzle: ValueGrid): GameCell[][] {
  return puzzle.map((row) =>
    row.map((value) => ({ value, given: value != null, notes: [] })),
  )
}

export function createGameStore(setup: GameSetup) {
  const initialCells = cellsFromPuzzle(setup.puzzle)

  return createStore<GameState>((set, get) => {
    const snapshot = (): GameSnapshot => ({
      cells: cloneCells(get().cells),
      mistakes: get().mistakes,
      status: get().status,
    })

    return {
      boxSize: setup.boxSize,
      difficulty: setup.difficulty ?? 'easy',
      cells: cloneCells(initialCells),
      initialCells: cloneCells(initialCells),
      solution: setup.solution,
      selected: null,
      notesMode: false,
      mistakes: 0,
      elapsedMs: 0,
      status: 'playing',
      history: [],
      future: [],
      moves: [],
      redoMoves: [],
      contradiction: null,

      selectCell: (cell) =>
        set((state) => ({
          selected:
            state.selected?.r === cell.r && state.selected?.c === cell.c
              ? null
              : cell,
          contradiction: null,
        })),

      deselect: () => set({ selected: null, contradiction: null }),

      clearContradiction: () => set({ contradiction: null }),

      toggleCandidate: (cell, digit) => {
        const state = get()
        const current = state.cells[cell.r]?.[cell.c]
        if (
          current == null ||
          current.given ||
          current.value != null ||
          state.status !== 'playing'
        ) {
          return
        }
        const cells = cloneCells(state.cells)
        const removing = current.notes.includes(digit)
        cells[cell.r][cell.c] = {
          ...current,
          notes: removing
            ? current.notes.filter((note) => note !== digit)
            : [...current.notes, digit].sort((a, b) => a - b),
        }
        const symbol = digitToSymbol(digit, state.boxSize)
        set({
          cells,
          contradiction: null,
          history: [...state.history, snapshot()],
          future: [],
          moves: [
            ...state.moves,
            {
              notation: `R${cell.r + 1}C${cell.c + 1}`,
              description: `Candidate ${symbol} ${removing ? 'removed' : 'added'}`,
            },
          ],
          redoMoves: [],
        })
      },

      toggleNotesMode: () => set((state) => ({ notesMode: !state.notesMode })),

      inputDigit: (digit) => {
        const state = get()
        const cell = state.selected
        if (cell == null || state.status !== 'playing') return
        const current = state.cells[cell.r]?.[cell.c]
        if (current == null || current.given) return
        if (current.value === digit) return

        const settings = getActiveUiSettings()
        const peers = peersFor(state.boxSize, cell)
        const conflictingCells = peers.filter(({ r, c }) => {
          const peer = state.cells[r][c]
          if (peer.value !== digit) return false
          return (
            settings.preventAllContradictions ||
            (settings.preventGivenContradictions && peer.given)
          )
        })
        if (conflictingCells.length > 0) {
          set({
            contradiction: {
              id: (state.contradiction?.id ?? 0) + 1,
              attemptedCell: cell,
              conflictingCells,
              digit,
              message: contradictionMessage(
                state.boxSize,
                cell,
                conflictingCells[0],
                digit,
              ),
            },
          })
          return
        }

        const cells = cloneCells(state.cells)
        cells[cell.r][cell.c] = { ...current, value: digit }
        if (settings.autoRemoveCandidates) {
          for (const { r, c } of peers) {
            const peer = cells[r][c]
            if (peer.value == null && peer.notes.includes(digit)) {
              cells[r][c] = {
                ...peer,
                notes: peer.notes.filter((note) => note !== digit),
              }
            }
          }
        }
        const mistakes =
          state.mistakes + (state.solution[cell.r][cell.c] === digit ? 0 : 1)
        const complete = cells.every((row, r) =>
          row.every((candidate, c) => candidate.value === state.solution[r][c]),
        )
        const status: GameStatus = complete ? 'won' : 'playing'

        set({
          cells,
          contradiction: null,
          mistakes,
          status,
          history: [...state.history, snapshot()],
          future: [],
          moves: [
            ...state.moves,
            {
              notation: `R${cell.r + 1}C${cell.c + 1}`,
              description:
                current.value == null
                  ? `Entered ${digitToSymbol(digit, state.boxSize)}`
                  : `Changed ${digitToSymbol(current.value, state.boxSize)} to ${digitToSymbol(digit, state.boxSize)}`,
            },
          ],
          redoMoves: [],
        })
      },

      erase: () => {
        const state = get()
        const cell = state.selected
        if (cell == null || state.status !== 'playing') return
        const current = state.cells[cell.r]?.[cell.c]
        if (current == null || current.given) return
        if (current.value == null && current.notes.length === 0) return
        const cells = cloneCells(state.cells)
        cells[cell.r][cell.c] = {
          ...current,
          value: null,
          notes: current.value == null ? [] : current.notes,
        }
        set({
          cells,
          contradiction: null,
          history: [...state.history, snapshot()],
          future: [],
          moves: [
            ...state.moves,
            {
              notation: `R${cell.r + 1}C${cell.c + 1}`,
              description:
                current.value == null
                  ? 'Cleared candidates'
                  : `Erased ${digitToSymbol(current.value, state.boxSize)}`,
            },
          ],
          redoMoves: [],
        })
      },

      clearCell: (cell) => {
        const state = get()
        const current = state.cells[cell.r]?.[cell.c]
        if (
          current == null ||
          current.given ||
          current.value == null ||
          state.status !== 'playing'
        ) {
          return
        }
        const cells = cloneCells(state.cells)
        cells[cell.r][cell.c] = { ...current, value: null }
        set({
          cells,
          contradiction: null,
          history: [...state.history, snapshot()],
          future: [],
          moves: [
            ...state.moves,
            {
              notation: `R${cell.r + 1}C${cell.c + 1}`,
              description: `Erased ${digitToSymbol(current.value, state.boxSize)}`,
            },
          ],
          redoMoves: [],
        })
      },

      undo: () => {
        const state = get()
        const previous = state.history.at(-1)
        if (previous == null) return
        const move = state.moves.at(-1) ?? {
          notation: '—',
          description: 'Restored move',
        }
        set({
          cells: cloneCells(previous.cells),
          contradiction: null,
          mistakes: previous.mistakes,
          status: previous.status,
          history: state.history.slice(0, -1),
          future: [snapshot(), ...state.future],
          moves: state.moves.slice(0, -1),
          redoMoves: [move, ...state.redoMoves],
        })
      },

      redo: () => {
        const state = get()
        const next = state.future[0]
        const move = state.redoMoves[0]
        if (next == null || move == null) return
        set({
          cells: cloneCells(next.cells),
          contradiction: null,
          mistakes: next.mistakes,
          status: next.status,
          history: [...state.history, snapshot()],
          future: state.future.slice(1),
          moves: [...state.moves, move],
          redoMoves: state.redoMoves.slice(1),
        })
      },

      toggleGuess: (moveIndex) =>
        set((state) => {
          const move = state.moves[moveIndex]
          if (move == null) return {}
          const moves = [...state.moves]
          if (move.isGuess) {
            const { isGuess: _isGuess, ...unflaggedMove } = move
            moves[moveIndex] = unflaggedMove
          } else {
            moves[moveIndex] = { ...move, isGuess: true }
          }
          return { moves }
        }),

      returnToGuess: (moveIndex) => {
        const state = get()
        const move = state.moves[moveIndex]
        const checkpoint = state.history[moveIndex]
        if (move?.isGuess !== true || checkpoint == null) return
        set({
          cells: cloneCells(checkpoint.cells),
          contradiction: null,
          selected: null,
          mistakes: checkpoint.mistakes,
          status: checkpoint.status,
          history: state.history.slice(0, moveIndex),
          future: [
            ...state.history.slice(moveIndex + 1),
            snapshot(),
          ],
          moves: state.moves.slice(0, moveIndex),
          redoMoves: state.moves.slice(moveIndex),
        })
      },

      hint: () => {
        const state = get()
        if (state.status !== 'playing') return
        let cell = state.selected
        if (cell == null || state.cells[cell.r]?.[cell.c]?.given) {
          const r = state.cells.findIndex((row) =>
            row.some((candidate) => candidate.value == null),
          )
          if (r < 0) return
          cell = { r, c: state.cells[r].findIndex((candidate) => candidate.value == null) }
        }
        const current = state.cells[cell.r][cell.c]
        if (current.value === state.solution[cell.r][cell.c]) return
        const cells = cloneCells(state.cells)
        const digit = state.solution[cell.r][cell.c]
        cells[cell.r][cell.c] = { ...current, value: digit }
        set({
          cells,
          contradiction: null,
          selected: cell,
          history: [...state.history, snapshot()],
          future: [],
          moves: [
            ...state.moves,
            {
              notation: `R${cell.r + 1}C${cell.c + 1}`,
              description: `Hint revealed ${digitToSymbol(digit, state.boxSize)}`,
            },
          ],
          redoMoves: [],
        })
      },

      restart: () =>
        set((state) => ({
          cells: cloneCells(state.initialCells),
          selected: null,
          notesMode: false,
          mistakes: 0,
          elapsedMs: 0,
          status: 'playing',
          history: [],
          future: [],
          moves: [],
          redoMoves: [],
          contradiction: null,
        })),

      loadGame: (nextSetup) => {
        const nextCells = cellsFromPuzzle(nextSetup.puzzle)
        set({
          boxSize: nextSetup.boxSize,
          difficulty: nextSetup.difficulty ?? 'easy',
          cells: cloneCells(nextCells),
          initialCells: cloneCells(nextCells),
          solution: nextSetup.solution,
          selected: null,
          notesMode: false,
          mistakes: 0,
          elapsedMs: 0,
          status: 'playing',
          history: [],
          future: [],
          moves: [],
          redoMoves: [],
          contradiction: null,
        })
      },

      restoreGame: (game) =>
        set({
          boxSize: game.boxSize,
          difficulty: game.difficulty,
          cells: game.cells,
          initialCells: game.initialCells,
          solution: game.solution,
          selected: null,
          notesMode: false,
          mistakes: game.mistakes,
          elapsedMs: game.elapsedMs,
          status: game.status,
          history: game.history,
          future: game.future,
          moves: game.moves,
          redoMoves: game.redoMoves,
          contradiction: null,
        }),

      tick: (milliseconds = 1000) =>
        set((state) =>
          state.status === 'playing'
            ? { elapsedMs: state.elapsedMs + milliseconds }
            : {},
        ),

      togglePause: () =>
        set((state) =>
          state.status === 'playing'
            ? { status: 'paused' }
            : state.status === 'paused'
              ? { status: 'playing' }
              : {},
        ),
    }
  })
}
