import { useEffect, useRef, useState } from 'react'

import {
  digitToSymbol,
  legalCandidates,
  peersFor,
} from '../../packages/engine/grid'
import type { Coordinate, Digit } from '../../packages/engine/grid'
import { detectContradictions } from '../../packages/engine/validate'
import {
  inspectionContainsCell,
  inspectionLabel,
  missingDigitsForUnit,
} from '../game/missingSymbols'
import type { UnitInspection } from '../game/missingSymbols'
import type { UiSettings } from '../game/uiSettings'
import type { GameState } from '../state/gameStore'

type BoardProps = Readonly<{
  state: GameState
  settings: UiSettings
}>

function sameCell(left: Coordinate | null, right: Coordinate): boolean {
  return left?.r === right.r && left.c === right.c
}

export function SudokuBoard({ state, settings }: BoardProps) {
  const [completionDismissed, setCompletionDismissed] = useState(false)
  const [inspection, setInspection] = useState<UnitInspection | null>(null)
  const inspectionPanelRef = useRef<HTMLElement>(null)
  const size = state.boxSize * state.boxSize

  useEffect(() => {
    setCompletionDismissed(false)
  }, [state.status])
  useEffect(() => {
    setInspection(null)
  }, [state.boxSize])
  useEffect(() => {
    if (inspection == null) return
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (inspectionPanelRef.current?.contains(target)) return
      if (
        target instanceof Element &&
        target.closest(
          '.column-unit-tabs, .row-unit-tabs, .box-unit-tabs',
        )
      ) {
        return
      }
      setInspection(null)
    }
    document.addEventListener('pointerdown', dismissOutside)
    return () => document.removeEventListener('pointerdown', dismissOutside)
  }, [inspection])
  const selectedValue =
    state.selected == null
      ? null
      : state.cells[state.selected.r]?.[state.selected.c]?.value
  const peers = new Set(
    state.selected == null
      ? []
      : peersFor(state.boxSize, state.selected).map(({ r, c }) => `${r}:${c}`),
  )
  const valueGrid = state.cells.map((row) => row.map((cell) => cell.value))
  const conflicts = new Set(
    detectContradictions(state.boxSize, valueGrid, 0)
      .filter((item) => item.kind === 'duplicate')
      .flatMap((item) => item.cells.map(({ r, c }) => `${r}:${c}`)),
  )
  const missingDigits =
    inspection == null
      ? []
      : missingDigitsForUnit(state.boxSize, valueGrid, inspection)
  const toggleInspection = (next: UnitInspection) => {
    setInspection((current) =>
      current?.kind === next.kind && current.index === next.index
        ? null
        : next,
    )
  }

  return (
    <div className="board-wrap">
      <div
        aria-label="Column missing-symbol controls"
        className="column-unit-tabs"
        role="group"
        style={{ '--grid-size': size } as React.CSSProperties}
      >
        {Array.from({ length: size }, (_, index) => (
          <button
            aria-label={`Show missing symbols for column ${index + 1}`}
            aria-pressed={
              inspection?.kind === 'column' && inspection.index === index
            }
            className={
              inspection?.kind === 'column' && inspection.index === index
                ? 'is-active'
                : ''
            }
            key={index}
            onClick={() => toggleInspection({ kind: 'column', index })}
            title={`Column ${index + 1}`}
            type="button"
          >
            {index + 1}
          </button>
        ))}
      </div>
      <div
        aria-label="Row missing-symbol controls"
        className="row-unit-tabs"
        role="group"
        style={{ '--grid-size': size } as React.CSSProperties}
      >
        {Array.from({ length: size }, (_, index) => (
          <button
            aria-label={`Show missing symbols for row ${index + 1}`}
            aria-pressed={
              inspection?.kind === 'row' && inspection.index === index
            }
            className={
              inspection?.kind === 'row' && inspection.index === index
                ? 'is-active'
                : ''
            }
            key={index}
            onClick={() => toggleInspection({ kind: 'row', index })}
            title={`Row ${index + 1}`}
            type="button"
          >
            {index + 1}
          </button>
        ))}
      </div>
      <div
        aria-label="Sudoku board"
        className="sudoku-board"
        onDragStart={(event) => event.preventDefault()}
        role="grid"
        style={{ '--grid-size': size } as React.CSSProperties}
      >
        {state.cells.flatMap((row, r) =>
          row.map((cell, c) => {
            const coordinate = { r, c }
            const selected = sameCell(state.selected, coordinate)
            const unitInspected =
              inspection != null &&
              inspectionContainsCell(state.boxSize, inspection, coordinate)
            const peer = settings.highlightPeers && peers.has(`${r}:${c}`)
            const matching =
              settings.highlightMatching &&
              selectedValue != null &&
              cell.value === selectedValue
            const conflict = conflicts.has(`${r}:${c}`)
            const rejected = sameCell(
              state.contradiction?.attemptedCell ?? null,
              coordinate,
            )
            const feedbackConflict =
              state.contradiction?.conflictingCells.some(
                (item) => sameCell(item, coordinate),
              ) ?? false
            const attemptedDigit = rejected
              ? state.contradiction?.digit ?? null
              : null
            const classes = [
              'sudoku-cell',
              selected && 'is-selected',
              peer && 'is-peer',
              matching && 'is-matching',
              unitInspected && 'is-unit-inspected',
              (conflict || feedbackConflict) && 'is-conflict',
              rejected && 'is-rejected',
              (c + 1) % state.boxSize === 0 && c + 1 < size && 'box-right',
              (r + 1) % state.boxSize === 0 && r + 1 < size && 'box-bottom',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <div className={classes} key={`${r}:${c}`} role="gridcell">
                <button
                  aria-label={`Row ${r + 1} column ${c + 1}, ${attemptedDigit != null ? `attempted ${digitToSymbol(attemptedDigit, state.boxSize)} conflicts` : cell.value == null ? 'empty' : digitToSymbol(cell.value, state.boxSize)}${cell.given ? ', given' : ''}`}
                  aria-pressed={selected}
                  className="cell-select"
                  onClick={() => state.selectCell(coordinate)}
                  onDoubleClick={() => state.clearCell(coordinate)}
                  type="button"
                >
                  {cell.value != null && attemptedDigit == null && (
                    <span className={cell.given ? 'given-value' : 'player-value'}>
                      {digitToSymbol(cell.value, state.boxSize)}
                    </span>
                  )}
                  {attemptedDigit != null && (
                    <span className="contradiction-ghost">
                      {digitToSymbol(attemptedDigit, state.boxSize)}
                    </span>
                  )}
                </button>
                {cell.value == null && attemptedDigit == null && (
                  <CandidateGrid
                    boxSize={state.boxSize}
                    cell={coordinate}
                    legalDigits={legalCandidates(
                      state.boxSize,
                      valueGrid,
                      coordinate,
                    )}
                    notes={cell.notes}
                    onToggle={state.toggleCandidate}
                    selected={selected}
                  />
                )}
              </div>
            )
          }),
        )}
      </div>
      <div
        aria-label="Box missing-symbol controls"
        className="box-unit-tabs"
        role="group"
        style={{ '--grid-size': size } as React.CSSProperties}
      >
        {Array.from({ length: size }, (_, index) => {
          const boxRow = Math.floor(index / state.boxSize)
          const boxColumn = index % state.boxSize
          const active =
            inspection?.kind === 'box' && inspection.index === index
          return (
            <button
              aria-label={`Show missing symbols for box ${index + 1}`}
              aria-pressed={active}
              className={active ? 'is-active' : ''}
              key={index}
              onClick={() => toggleInspection({ kind: 'box', index })}
              style={{
                gridColumn: boxColumn * state.boxSize + 1,
                gridRow: boxRow * state.boxSize + 1,
              }}
              title={`Box ${index + 1}`}
              type="button"
            >
              <span aria-hidden="true">▦</span>
            </button>
          )
        })}
      </div>
      {inspection != null && (
        <section
          aria-label={`Missing symbols for ${inspectionLabel(inspection)}`}
          className="missing-symbol-panel"
          ref={inspectionPanelRef}
          role="dialog"
        >
          <div className="missing-symbol-heading">
            <span aria-hidden="true" className="missing-symbol-scope-icon">
              {inspection.kind === 'row'
                ? '↔'
                : inspection.kind === 'column'
                  ? '↕'
                  : '▦'}
            </span>
            <strong>
              {inspection.kind === 'column'
                ? 'Column'
                : inspection.kind[0].toUpperCase() + inspection.kind.slice(1)}{' '}
              {inspection.index + 1} needs
            </strong>
            <button
              aria-label="Close missing symbols"
              className="missing-symbol-close"
              onClick={() => setInspection(null)}
              type="button"
            >
              ×
            </button>
          </div>
          {missingDigits.length === 0 ? (
            <p className="unit-complete-message">
              <span aria-hidden="true">✓</span> All symbols placed.
            </p>
          ) : (
            <div
              aria-label="Missing symbols"
              className="missing-symbol-list"
              role="list"
              style={
                { '--box-size': state.boxSize } as React.CSSProperties
              }
            >
              {missingDigits.map((digit) => (
                <span
                  className="missing-symbol-chip"
                  key={digit}
                  role="listitem"
                >
                  {digitToSymbol(digit, state.boxSize)}
                </span>
              ))}
            </div>
          )}
        </section>
      )}
      {state.status !== 'playing' &&
        (state.status !== 'won' || !completionDismissed) && (
        <div
          aria-label={state.status === 'won' ? 'Puzzle completed' : undefined}
          aria-live={state.status === 'won' ? 'polite' : undefined}
          className={`board-overlay${state.status === 'won' ? ' completion-overlay' : ''}`}
          onAnimationEnd={(event) => {
            if (
              state.status === 'won' &&
              event.target === event.currentTarget
            ) {
              setCompletionDismissed(true)
            }
          }}
          role={state.status === 'won' ? 'status' : undefined}
          style={
            state.status === 'won'
              ? ({ '--completion-hold': '2.5s' } as React.CSSProperties)
              : undefined
          }
        >
          <p>
            {state.status === 'paused'
              ? 'Game paused'
              : state.status === 'won'
                ? 'Puzzle Completed!'
                : 'Three mistakes — game over'}
          </p>
          {state.status === 'paused' && (
            <button className="primary-button" onClick={state.togglePause} type="button">
              Resume game
            </button>
          )}
        </div>
      )}
    </div>
  )
}

type CandidateGridProps = Readonly<{
  boxSize: 2 | 3 | 4
  cell: Coordinate
  legalDigits: ReadonlySet<Digit>
  notes: Digit[]
  selected: boolean
  onToggle: (cell: Coordinate, digit: Digit) => void
}>

function CandidateGrid({
  boxSize,
  cell,
  legalDigits,
  notes,
  selected,
  onToggle,
}: CandidateGridProps) {
  const size = boxSize * boxSize
  return (
    <div
      aria-hidden={!selected}
      className={`candidate-grid ${selected ? 'is-active' : ''}`}
      style={{ '--box-size': boxSize } as React.CSSProperties}
    >
      {Array.from({ length: size }, (_, index) => index + 1).map((digit) => {
        const active = notes.includes(digit)
        const conflicting = active && !legalDigits.has(digit)
        return selected ? (
          <button
            aria-label={`${active ? 'Remove' : 'Add'} candidate ${digitToSymbol(digit, boxSize)} at row ${cell.r + 1} column ${cell.c + 1}`}
            aria-invalid={conflicting || undefined}
            aria-pressed={active}
            className={
              [
                'candidate standard-candidate',
                active ? 'active' : 'is-guide',
                conflicting && 'is-candidate-conflict',
              ]
                .filter(Boolean)
                .join(' ')
            }
            key={digit}
            onClick={(event) => {
              event.stopPropagation()
              onToggle(cell, digit)
            }}
            type="button"
          >
            {digitToSymbol(digit, boxSize)}
          </button>
        ) : (
          <span
            className={
              [
                'candidate standard-candidate',
                active && 'active',
                conflicting && 'is-candidate-conflict',
              ]
                .filter(Boolean)
                .join(' ')
            }
            key={digit}
          >
            {active ? digitToSymbol(digit, boxSize) : ''}
          </span>
        )
      })}
    </div>
  )
}
