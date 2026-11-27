import { useEffect, useRef, useState } from 'react'

import { digitToSymbol, legalCandidates } from '../../packages/engine/grid'
import { candidatesContainSolutions } from '../game/checkCandidates'
import { showGameToast } from '../game/errorToast'
import type { GameState } from '../state/gameStore'

type GameControlsProps = Readonly<{
  state: GameState
  showRemainingCounts: boolean
}>

type SelectedCellEditorProps = Readonly<{ state: GameState }>
type CandidateCheckResult = 'success' | 'error'

export function GameControls({ state, showRemainingCounts }: GameControlsProps) {
  const size = state.boxSize * state.boxSize
  const selected = state.selected
  const selectedCell =
    selected == null
      ? null
      : state.cells[selected.r]?.[selected.c] ?? null
  const selectedDigit = selectedCell?.value ?? null
  const counts = Array.from({ length: size }, (_, index) => {
    const digit = index + 1
    return state.cells.flat().filter((cell) => cell.value === digit).length
  })
  const previousCounts = useRef(counts)
  const dismissCheckToast = useRef<(() => void) | null>(null)
  const [candidateCheck, setCandidateCheck] = useState<{
    result: CandidateCheckResult
    attempt: number
  } | null>(null)

  useEffect(() => {
    previousCounts.current = counts
  }, [counts])

  useEffect(
    () => () => {
      dismissCheckToast.current?.()
    },
    [],
  )

  const checkCandidates = () => {
    const success = candidatesContainSolutions(state.cells, state.solution)
    const result: CandidateCheckResult = success ? 'success' : 'error'
    const message = success
      ? 'Candidates check out — every solution is still possible!'
      : 'Some empty cells are missing their solution candidate.'
    dismissCheckToast.current?.()
    dismissCheckToast.current = showGameToast(message, result)
    setCandidateCheck((previous) => ({
      result,
      attempt: (previous?.attempt ?? 0) + 1,
    }))
  }

  return (
    <aside className="game-controls" aria-label="Game controls">
      <section aria-label="Fill in numbers" className="number-entry">
        <h2>Fill in</h2>
        <div
          className="number-pad"
          aria-label="Number pad"
          role="group"
          style={{ '--box-size': state.boxSize } as React.CSSProperties}
        >
          {counts.map((count, index) => {
            const digit = index + 1
            const remaining = size - count
            const complete = remaining === 0
            const justCompleted =
              complete && (previousCounts.current[index] ?? size) < size
            const classes = [
              'number-key',
              selectedDigit === digit && 'is-selected',
              complete && 'is-complete',
              justCompleted && 'is-just-completed',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                aria-label={`Enter ${digitToSymbol(digit, state.boxSize)}, ${remaining} remaining`}
                aria-pressed={selectedDigit === digit}
                className={classes}
                disabled={
                  (remaining === 0 && selectedDigit !== digit) ||
                  state.status !== 'playing'
                }
                key={digit}
                onClick={(event) => {
                  state.inputDigit(digit)
                  event.currentTarget.blur()
                }}
                onDoubleClick={() => {
                  if (
                    selected != null &&
                    selectedCell?.given === false &&
                    selectedDigit === digit
                  ) {
                    state.clearCell(selected)
                  }
                }}
                type="button"
              >
                {showRemainingCounts && <small>{remaining} left</small>}
                <span>{digitToSymbol(digit, state.boxSize)}</span>
              </button>
            )
          })}
        </div>
        <div
          className={[
            'candidate-check-feedback',
            candidateCheck && `is-${candidateCheck.result}`,
            candidateCheck &&
              `attempt-${candidateCheck.attempt % 2 === 0 ? 'even' : 'odd'}`,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <button
            className="check-candidates-button"
            disabled={state.status !== 'playing'}
            onClick={checkCandidates}
            type="button"
          >
            <span aria-hidden="true">
              {candidateCheck?.result === 'success'
                ? '✓'
                : candidateCheck?.result === 'error'
                  ? '×'
                  : '◇'}
            </span>
            Check Candidates
          </button>
          {candidateCheck?.result === 'success' && (
            <span
              aria-hidden="true"
              className="candidate-check-sparkles"
            >
              <span>✦</span>
              <span>✧</span>
              <span>✦</span>
            </span>
          )}
        </div>
      </section>

      <SelectedCellEditor state={state} />

      <p className="shortcut-note">
        Keyboard: arrows to move · {size > 9 ? '1–9 or A–G' : '1–9'} to enter · Shift+symbol for candidates · Ctrl/Cmd+Z to undo
      </p>
    </aside>
  )
}

function SelectedCellEditor({ state }: SelectedCellEditorProps) {
  const selected = state.selected
  if (selected == null) return null

  const cell = state.cells[selected.r]?.[selected.c]
  if (cell == null || cell.value != null) return null
  const size = state.boxSize * state.boxSize
  const notation = `R${selected.r + 1}C${selected.c + 1}`
  const legalDigits = legalCandidates(
    state.boxSize,
    state.cells.map((row) => row.map((candidate) => candidate.value)),
    selected,
  )

  return (
    <section aria-label="Selected cell editor" className="cell-editor">
      <div className="cell-editor-heading">
        <div>
          <h2>Candidate Pad</h2>
          <span>{notation} · temporary notes</span>
        </div>
        <button onClick={state.deselect} type="button">Deselect</button>
      </div>

      <div
          aria-label={`Candidates for selected cell ${notation}`}
          className="enlarged-candidates"
          role="group"
          style={{ '--box-size': state.boxSize } as React.CSSProperties}
        >
          {Array.from({ length: size }, (_, index) => index + 1).map((digit) => {
            const active = cell.notes.includes(digit)
            const conflicting = active && !legalDigits.has(digit)
            const symbol = digitToSymbol(digit, state.boxSize)
            return (
              <button
                aria-label={`${active ? 'Remove' : 'Add'} candidate ${symbol} in enlarged cell`}
                aria-invalid={conflicting || undefined}
                aria-pressed={active}
                className={
                  [
                    'enlarged-candidate handwritten-candidate',
                    active && 'active',
                    conflicting && 'is-candidate-conflict',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
                disabled={cell.given || state.status !== 'playing'}
                key={digit}
                onClick={() => state.toggleCandidate(selected, digit)}
                type="button"
              >
                {symbol}
              </button>
            )
          })}
      </div>
    </section>
  )
}
