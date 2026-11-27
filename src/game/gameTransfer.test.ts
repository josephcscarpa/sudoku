import { describe, expect, it } from 'vitest'

import { createGameStore } from '../state/gameStore'
import {
  DEFAULT_UI_SETTINGS,
  setActiveUiSettings,
} from './uiSettings'
import { decodeGameExport, encodeGameExport } from './gameTransfer'

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

describe('game transfer', () => {
  it('round-trips progress, candidates, and the undo/redo move stack', () => {
    setActiveUiSettings({
      ...DEFAULT_UI_SETTINGS,
      preventGivenContradictions: false,
      preventAllContradictions: false,
    })
    const source = createGameStore({ boxSize: 2, puzzle, solution })
    source.getState().toggleCandidate({ r: 0, c: 1 }, 1)
    source.getState().selectCell({ r: 0, c: 0 })
    source.getState().inputDigit(2)
    source.getState().undo()
    source.getState().toggleGuess(0)

    const decoded = decodeGameExport(encodeGameExport(source.getState()))
    const restored = createGameStore({ boxSize: 2, puzzle, solution })
    restored.getState().restoreGame(decoded)

    expect(restored.getState().cells[0][1].notes).toEqual([1])
    expect(restored.getState().moves).toEqual([
      {
        notation: 'R1C2',
        description: 'Candidate 1 added',
        isGuess: true,
      },
    ])
    expect(restored.getState().future).toHaveLength(1)

    restored.getState().redo()
    expect(restored.getState().cells[0][0].value).toBe(2)
    expect(restored.getState().mistakes).toBe(1)
  })

  it('rejects malformed imports', () => {
    expect(() => decodeGameExport('{"version": 99}')).toThrow(
      'Unsupported Sudoku game data',
    )
  })

  it('rejects move lists that do not match their snapshot history', () => {
    const source = createGameStore({ boxSize: 2, puzzle, solution })
    const exported = JSON.parse(encodeGameExport(source.getState()))
    exported.moves.push({ notation: 'R1C1', description: 'Impossible move' })

    expect(() => decodeGameExport(JSON.stringify(exported))).toThrow(
      'Move history is inconsistent',
    )
  })

  it('records when the save file was exported without affecting restore', () => {
    const source = createGameStore({ boxSize: 2, puzzle, solution })
    const exportedAt = new Date('2026-08-07T18:05:04.000Z')

    const encoded = encodeGameExport(source.getState(), exportedAt)
    const payload = JSON.parse(encoded)

    expect(payload.exportedAt).toBe('2026-08-07T18:05:04.000Z')
    expect(decodeGameExport(encoded).cells).toEqual(source.getState().cells)
  })
})
