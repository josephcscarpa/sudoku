import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_UI_SETTINGS,
  setActiveUiSettings,
} from '../game/uiSettings'
import { createGameStore } from './gameStore'

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

describe('game store', () => {
  beforeEach(() => setActiveUiSettings(DEFAULT_UI_SETTINGS))

  it('removes a placed digit from peer candidates and undoes atomically', () => {
    const emptyPuzzle: (number | null)[][] = solution.map((row) =>
      row.map(() => null),
    )
    const store = createGameStore({ boxSize: 2, puzzle: emptyPuzzle, solution })

    store.getState().toggleCandidate({ r: 0, c: 1 }, 1)
    store.getState().toggleCandidate({ r: 1, c: 0 }, 1)
    store.getState().toggleCandidate({ r: 1, c: 1 }, 1)
    store.getState().toggleCandidate({ r: 2, c: 2 }, 1)
    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(1)

    expect(store.getState().cells[0][0].value).toBe(1)
    expect(store.getState().cells[0][1].notes).not.toContain(1)
    expect(store.getState().cells[1][0].notes).not.toContain(1)
    expect(store.getState().cells[1][1].notes).not.toContain(1)
    expect(store.getState().cells[2][2].notes).toContain(1)

    store.getState().undo()

    expect(store.getState().cells[0][0].value).toBeNull()
    expect(store.getState().cells[0][1].notes).toContain(1)
    expect(store.getState().cells[1][0].notes).toContain(1)
    expect(store.getState().cells[1][1].notes).toContain(1)
    expect(store.getState().cells[2][2].notes).toContain(1)
  })

  it('keeps peer candidates when automatic removal is disabled', () => {
    setActiveUiSettings({
      ...DEFAULT_UI_SETTINGS,
      autoRemoveCandidates: false,
    })
    const store = createGameStore({ boxSize: 2, puzzle, solution })

    store.getState().toggleCandidate({ r: 0, c: 1 }, 1)
    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(1)

    expect(store.getState().cells[0][1].notes).toContain(1)
  })

  it('prevents entries that conflict with givens or player-filled peers', () => {
    const emptyPuzzle: (number | null)[][] = solution.map((row) =>
      row.map(() => null),
    )
    emptyPuzzle[0][2] = 3
    const store = createGameStore({ boxSize: 2, puzzle: emptyPuzzle, solution })

    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(3)
    expect(store.getState().cells[0][0].value).toBeNull()
    expect(store.getState().history).toHaveLength(0)
    expect(store.getState().mistakes).toBe(0)

    store.getState().inputDigit(1)
    store.getState().selectCell({ r: 1, c: 0 })
    store.getState().inputDigit(1)
    expect(store.getState().cells[1][0].value).toBeNull()
    expect(store.getState().history).toHaveLength(1)
    expect(store.getState().mistakes).toBe(0)
  })

  it('describes a blocked contradiction without committing the attempted value', () => {
    const emptyPuzzle = solution.map((row) => row.map(() => null))
    const store = createGameStore({ boxSize: 2, puzzle: emptyPuzzle, solution })

    store.getState().selectCell({ r: 0, c: 1 })
    store.getState().inputDigit(1)
    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(1)

    expect(store.getState().cells[0][0].value).toBeNull()
    expect(store.getState().history).toHaveLength(1)
    expect(store.getState().contradiction).toMatchObject({
      attemptedCell: { r: 0, c: 0 },
      conflictingCells: [{ r: 0, c: 1 }],
      digit: 1,
      message: '1 already appears in row 1 at R1C2.',
    })

    store.getState().clearContradiction()
    expect(store.getState().contradiction).toBeNull()
  })

  it('clears blocked contradiction feedback after a successful candidate edit', () => {
    const emptyPuzzle = solution.map((row) => row.map(() => null))
    const store = createGameStore({ boxSize: 2, puzzle: emptyPuzzle, solution })

    store.getState().selectCell({ r: 0, c: 1 })
    store.getState().inputDigit(1)
    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(1)
    expect(store.getState().contradiction).not.toBeNull()

    store.getState().toggleCandidate({ r: 0, c: 0 }, 2)

    expect(store.getState().contradiction).toBeNull()
  })

  it('clears blocked contradiction feedback when undoing or restarting', () => {
    const emptyPuzzle = solution.map((row) => row.map(() => null))
    const store = createGameStore({ boxSize: 2, puzzle: emptyPuzzle, solution })

    store.getState().selectCell({ r: 0, c: 1 })
    store.getState().inputDigit(1)
    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(1)
    store.getState().undo()
    expect(store.getState().contradiction).toBeNull()

    store.getState().redo()
    store.getState().inputDigit(1)
    expect(store.getState().contradiction).not.toBeNull()
    store.getState().restart()
    expect(store.getState().contradiction).toBeNull()
  })

  it('allows conflicting player entries when that prevention is disabled', () => {
    setActiveUiSettings({
      ...DEFAULT_UI_SETTINGS,
      preventGivenContradictions: false,
      preventAllContradictions: false,
    })
    const emptyPuzzle = solution.map((row) => row.map(() => null))
    const store = createGameStore({ boxSize: 2, puzzle: emptyPuzzle, solution })

    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(1)
    store.getState().selectCell({ r: 1, c: 0 })
    store.getState().inputDigit(1)

    expect(store.getState().cells[1][0].value).toBe(1)
  })

  it('deselects a repeated cell and preserves its candidates when de-filled', () => {
    const store = createGameStore({ boxSize: 2, puzzle, solution })

    store.getState().toggleCandidate({ r: 0, c: 0 }, 2)
    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().selectCell({ r: 0, c: 0 })

    expect(store.getState().selected).toBeNull()
    expect(store.getState().cells[0][0].notes).toEqual([2])

    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(1)
    expect(store.getState().cells[0][0]).toMatchObject({
      value: 1,
      notes: [2],
    })

    store.getState().clearCell({ r: 0, c: 0 })
    expect(store.getState().cells[0][0]).toMatchObject({
      value: null,
      notes: [2],
    })
  })

  it('records moves in grid notation and can redo an undone move', () => {
    const store = createGameStore({ boxSize: 2, puzzle, solution })

    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(1)

    expect(store.getState().moves).toEqual([
      { notation: 'R1C1', description: 'Entered 1' },
    ])

    store.getState().undo()
    expect(store.getState().cells[0][0].value).toBeNull()
    expect(store.getState().moves).toEqual([])

    store.getState().redo()
    expect(store.getState().cells[0][0].value).toBe(1)
    expect(store.getState().moves).toEqual([
      { notation: 'R1C1', description: 'Entered 1' },
    ])
  })

  it('flags a guess and returns to the state immediately before it', () => {
    setActiveUiSettings({
      ...DEFAULT_UI_SETTINGS,
      preventGivenContradictions: false,
      preventAllContradictions: false,
    })
    const store = createGameStore({ boxSize: 2, puzzle, solution })

    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(1)
    store.getState().selectCell({ r: 0, c: 1 })
    store.getState().inputDigit(1)
    store.getState().inputDigit(2)
    store.getState().toggleGuess(1)

    expect(store.getState().moves[1]).toMatchObject({
      notation: 'R1C2',
      description: 'Entered 1',
      isGuess: true,
    })

    store.getState().returnToGuess(1)

    expect(store.getState().cells[0][0].value).toBe(1)
    expect(store.getState().cells[0][1].value).toBeNull()
    expect(store.getState().moves).toEqual([
      { notation: 'R1C1', description: 'Entered 1' },
    ])
    expect(store.getState().future).toHaveLength(2)

    store.getState().redo()
    expect(store.getState().cells[0][0].value).toBe(1)
    expect(store.getState().cells[0][1].value).toBe(1)
    expect(store.getState().moves[1].isGuess).toBe(true)
  })

  it('keeps number entry separate from direct candidate editing', () => {
    setActiveUiSettings({
      ...DEFAULT_UI_SETTINGS,
      preventGivenContradictions: false,
      preventAllContradictions: false,
    })
    const store = createGameStore({ boxSize: 2, puzzle, solution })

    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().toggleNotesMode()
    store.getState().inputDigit(2)

    expect(store.getState().cells[0][0]).toMatchObject({
      value: 2,
      notes: [],
    })
  })

  it('keeps the game playable after repeated incorrect entries', () => {
    setActiveUiSettings({
      ...DEFAULT_UI_SETTINGS,
      preventGivenContradictions: false,
      preventAllContradictions: false,
    })
    const store = createGameStore({ boxSize: 2, puzzle, solution })

    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(2)
    store.getState().erase()
    store.getState().inputDigit(3)
    store.getState().erase()
    store.getState().inputDigit(4)

    expect(store.getState().mistakes).toBe(3)
    expect(store.getState().status).toBe('playing')

    store.getState().erase()
    store.getState().inputDigit(2)

    expect(store.getState().mistakes).toBe(4)
    expect(store.getState().status).toBe('playing')
  })

  it('keeps a completed puzzle won when pause is toggled', () => {
    const store = createGameStore({ boxSize: 2, puzzle, solution })

    store.getState().selectCell({ r: 0, c: 0 })
    store.getState().inputDigit(1)
    store.getState().selectCell({ r: 0, c: 1 })
    store.getState().inputDigit(2)
    expect(store.getState().status).toBe('won')

    store.getState().togglePause()
    store.getState().togglePause()

    expect(store.getState().status).toBe('won')
  })

  it('reveals a selected cell with a hint and can restart the puzzle', () => {
    const store = createGameStore({ boxSize: 2, puzzle, solution })

    store.getState().selectCell({ r: 0, c: 1 })
    store.getState().hint()
    expect(store.getState().cells[0][1].value).toBe(2)

    store.getState().restart()
    expect(store.getState().cells[0][1].value).toBeNull()
    expect(store.getState().elapsedMs).toBe(0)
  })

  it('loads a new game and makes it the restart baseline', () => {
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const nextPuzzle = solution.map((row) => [...row])
    nextPuzzle[3][3] = null as never

    store.getState().loadGame({
      boxSize: 2,
      puzzle: nextPuzzle,
      solution,
      difficulty: 'hard',
    })
    store.getState().selectCell({ r: 3, c: 3 })
    store.getState().inputDigit(1)
    store.getState().restart()

    expect(store.getState().difficulty).toBe('hard')
    expect(store.getState().cells[3][3].value).toBeNull()
  })
})
