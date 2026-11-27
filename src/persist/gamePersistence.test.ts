import { beforeEach, describe, expect, it } from 'vitest'

import { createGameStore } from '../state/gameStore'
import {
  attachGamePersistence,
  GAME_STORAGE_KEY,
  hasActiveSavedGame,
  restoreGame,
  saveGame,
} from './gamePersistence'

const solution = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1],
]

const puzzle = [
  [null, null, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1],
]

describe('game persistence', () => {
  beforeEach(() => localStorage.clear())

  it('restores values, candidates, timer, and metadata from localStorage', () => {
    const source = createGameStore({ boxSize: 2, puzzle, solution })
    source.getState().toggleCandidate({ r: 0, c: 1 }, 3)
    source.getState().selectCell({ r: 0, c: 0 })
    source.getState().inputDigit(1)
    source.getState().tick(5_000)
    saveGame(localStorage, source.getState(), new Date('2026-08-06T00:00:00Z'))

    const target = createGameStore({ boxSize: 2, puzzle, solution })
    expect(restoreGame(localStorage, target)).toBe(true)

    expect(target.getState()).toMatchObject({
      elapsedMs: 5_000,
      mistakes: 0,
      selected: { r: 0, c: 0 },
      status: 'playing',
    })
    expect(target.getState().cells[0][0].value).toBe(1)
    expect(target.getState().cells[0][1].notes).toEqual([3])
  })

  it('returns false when no saved game exists', () => {
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    expect(restoreGame(localStorage, store)).toBe(false)
  })

  it.each(['playing', 'paused'] as const)(
    'recognizes a saved %s game as active',
    (status) => {
      const store = createGameStore({ boxSize: 2, puzzle, solution })
      store.setState({ status })
      saveGame(localStorage, store.getState())

      expect(hasActiveSavedGame(localStorage)).toBe(true)
    },
  )

  it.each(['won', 'lost'] as const)(
    'does not recognize a saved %s game as active',
    (status) => {
      const store = createGameStore({ boxSize: 2, puzzle, solution })
      store.setState({ status })
      saveGame(localStorage, store.getState())

      expect(hasActiveSavedGame(localStorage)).toBe(false)
    },
  )

  it('does not recognize a missing saved game as active', () => {
    expect(hasActiveSavedGame(localStorage)).toBe(false)
  })

  it('autosaves subsequent store changes', () => {
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const detach = attachGamePersistence(localStorage, store)

    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(1)

    expect(localStorage.getItem(GAME_STORAGE_KEY)).toContain(
      '"format": "sudoku-clone/v1"',
    )
    detach()
  })
})
