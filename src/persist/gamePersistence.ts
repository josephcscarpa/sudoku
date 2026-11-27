import type { StoreApi } from 'zustand'

import { solve } from '../../packages/engine/solver'
import type { CompleteGrid } from '../../packages/engine/grid'
import { decodeNative, encodeNative } from '../codec/native'
import type { NativeGame } from '../codec/native'
import { parsePlaintext, serializePlaintext } from '../codec/plaintext'
import type { GameState } from '../state/gameStore'

export const GAME_STORAGE_KEY = 'sudoku-clone/current-game'

export function hasActiveSavedGame(storage: Storage): boolean {
  const saved = storage.getItem(GAME_STORAGE_KEY)
  if (saved == null) return false
  const { status } = decodeNative(saved)
  return status === 'playing' || status === 'paused'
}

export function saveGame(
  storage: Storage,
  state: GameState,
  createdAt = new Date(),
): void {
  const givens = state.initialCells.map((row) =>
    row.map((cell) => (cell?.given ? cell.value : null)),
  )
  const cells = state.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell != null &&
      !cell.given &&
      (cell.value != null || cell.notes.length > 0)
        ? [{ r, c, value: cell.value, candidates: [...cell.notes] }]
        : [],
    ),
  )
  const native: NativeGame = {
    format: 'sudoku-clone/v1',
    boxSize: state.boxSize,
    givens: serializePlaintext(state.boxSize, givens).replaceAll('\n', ''),
    cells,
    elapsedMs: state.elapsedMs,
    mistakes: state.mistakes,
    difficulty: state.difficulty,
    createdAt: createdAt.toISOString(),
    status: state.status,
    selected: state.selected,
  }
  storage.setItem(GAME_STORAGE_KEY, encodeNative(native))
}

export function restoreGame(
  storage: Storage,
  store: StoreApi<GameState>,
): boolean {
  const saved = storage.getItem(GAME_STORAGE_KEY)
  if (saved == null) return false

  const native = decodeNative(saved)
  const parsed = parsePlaintext(native.givens)
  if (parsed.boxSize !== native.boxSize) {
    throw new Error('Saved game box size does not match its givens')
  }
  const solved = solve(native.boxSize, parsed.grid)
  if (solved == null) {
    throw new Error('Saved game givens have no solution')
  }

  store.getState().loadGame({
    boxSize: native.boxSize,
    puzzle: parsed.grid,
    solution: solved as CompleteGrid,
    difficulty: native.difficulty,
  })
  const cells = store
    .getState()
    .cells.map((row) => row.map((cell) => ({ ...cell, notes: [...cell.notes] })))
  const size = native.boxSize * native.boxSize
  for (const savedCell of native.cells) {
    if (
      savedCell.r < 0 ||
      savedCell.c < 0 ||
      savedCell.r >= size ||
      savedCell.c >= size
    ) {
      throw new Error(
        `Saved cell R${savedCell.r + 1}C${savedCell.c + 1} is outside the board`,
      )
    }
    const current = cells[savedCell.r][savedCell.c]
    cells[savedCell.r][savedCell.c] = {
      ...current,
      value: savedCell.value,
      notes: [...savedCell.candidates],
    }
  }
  store.setState({
    cells,
    elapsedMs: native.elapsedMs,
    mistakes: native.mistakes,
    status: native.status,
    selected: native.selected,
  })
  return true
}

export function attachGamePersistence(
  storage: Storage,
  store: StoreApi<GameState>,
): () => void {
  restoreGame(storage, store)
  return store.subscribe((state) => saveGame(storage, state))
}
