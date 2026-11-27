import type { CompleteGrid, ValueGrid } from '../../packages/engine/grid'
import {
  attachGamePersistence,
  GAME_STORAGE_KEY,
  hasActiveSavedGame,
} from '../persist/gamePersistence'
import { createGameStore } from '../state/gameStore'

export const defaultSolution: CompleteGrid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

export const defaultPuzzle: ValueGrid = defaultSolution.map((row, r) =>
  row.map((digit, c) => (c % 3 === r % 3 ? null : digit)),
)

export const defaultGameStore = createGameStore({
  boxSize: 3,
  puzzle: defaultPuzzle,
  solution: defaultSolution,
  difficulty: 'easy',
})

export let defaultGameHasActiveSave = false

if (typeof window !== 'undefined') {
  try {
    defaultGameHasActiveSave = hasActiveSavedGame(window.localStorage)
    attachGamePersistence(window.localStorage, defaultGameStore)
  } catch {
    window.localStorage.removeItem(GAME_STORAGE_KEY)
    defaultGameHasActiveSave = false
    attachGamePersistence(window.localStorage, defaultGameStore)
  }
}
