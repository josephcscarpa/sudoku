import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { decodeGameExport, encodeGameExport } from '../game/gameTransfer'
import { setActiveUiSettings, type UiSettings } from '../game/uiSettings'
import type { GameState, MoveRecord } from '../state/gameStore'

type GameSidebarProps = Readonly<{
  state: GameState
  celebrateNewGame: boolean
  onNewGame: () => void
  settings: UiSettings
  onSettingsChange: (settings: UiSettings) => void
}>

type TimelineMove = Readonly<{
  move: MoveRecord
  index: number
  active: boolean
}>

type MoveTimelineEntry =
  | Readonly<{ kind: 'move'; item: TimelineMove }>
  | Readonly<{
      kind: 'candidate-group'
      key: string
      items: TimelineMove[]
    }>

export function GameSidebar({
  state,
  celebrateNewGame,
  onNewGame,
  settings,
  onSettingsChange,
}: GameSidebarProps) {
  setActiveUiSettings(settings)
  const [transferStatus, setTransferStatus] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [expandedCandidateGroups, setExpandedCandidateGroups] = useState(
    () => new Set<string>(),
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const moveTimeline = [
    ...state.moves.map((move, index) => ({ move, index, active: true })),
    ...state.redoMoves.map((move, offset) => ({
      move,
      index: state.moves.length + offset,
      active: false,
    })),
  ]
  const displayedMoves = compactCandidateMoves(moveTimeline).reverse()
  const exportGame = () => {
    const exportedAt = new Date()
    const file = new Blob([encodeGameExport(state, exportedAt)], {
      type: 'text/plain;charset=utf-8',
    })
    const url = window.URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = saveFilename(state, exportedAt)
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => window.URL.revokeObjectURL(url), 0)
    setTransferStatus('Game saved.')
  }

  const importGame = async (file: File) => {
    try {
      state.restoreGame(decodeGameExport(await readTextFile(file)))
      setTransferStatus('Game restored successfully.')
    } catch (error) {
      console.error('Failed to import Sudoku game:', error)
      setTransferStatus(
        error instanceof Error ? error.message : 'Could not restore game.',
      )
    }
  }

  return (
    <aside aria-label="Game sidebar" className="game-sidebar">
      <div className="sidebar-new-game-group">
        <button
          className={`sidebar-new-game${celebrateNewGame ? ' is-celebrating' : ''}`}
          onClick={onNewGame}
          type="button"
        >
          New Game
        </button>
        <span className="current-difficulty">
          {formatDifficulty(state.difficulty)}
        </span>
      </div>
      <section
        aria-label="Save and restore game"
        className="sidebar-section transfer-section transfer-compact"
      >
        <h2>Save Game / Restore Game</h2>
        <input
          accept=".txt,text/plain,application/json"
          aria-label="Choose saved game file"
          className="visually-hidden"
          onChange={(event) => {
            const input = event.currentTarget
            const file = input.files?.[0]
            if (file != null) {
              void importGame(file).finally(() => {
                input.value = ''
              })
            }
          }}
          ref={fileInputRef}
          type="file"
        />
        <div className="transfer-actions">
          <button onClick={exportGame} type="button">Save Game</button>
          <button onClick={() => fileInputRef.current?.click()} type="button">
            Restore Game
          </button>
        </div>
        <p aria-live="polite" className="transfer-status" role="status">
          {transferStatus}
        </p>
      </section>
      <section className="sidebar-section">
        <h2>Tools</h2>
        <div className="sidebar-tools">
          <button disabled={state.history.length === 0} onClick={state.undo} type="button">
            <span aria-hidden="true">↶</span>
            Undo
          </button>
          <button disabled={state.future.length === 0} onClick={state.redo} type="button">
            <span aria-hidden="true">↷</span>
            Redo
          </button>
          <button onClick={state.erase} type="button">
            <span aria-hidden="true">⌫</span>
            Erase
          </button>
          <button onClick={state.hint} type="button">
            <span aria-hidden="true">◇</span>
            Hint
          </button>
          <button onClick={() => setResetOpen(true)} type="button">
            <span aria-hidden="true">↺</span>
            Reset
          </button>
        </div>
      </section>

      <section className="sidebar-section move-section">
        <div className="sidebar-heading">
          <h2>Moves</h2>
          <span>{moveTimeline.length}</span>
        </div>
        {moveTimeline.length === 0 ? (
          <p className="empty-moves">Your moves will appear here.</p>
        ) : (
          <ol aria-label="Move stack" className="move-stack">
            {displayedMoves.map((entry) => {
              if (entry.kind === 'move') {
                return (
                  <MoveRow
                    item={entry.item}
                    key={moveKey(entry.item)}
                    state={state}
                  />
                )
              }

              const first = entry.items[0]
              const last = entry.items.at(-1) ?? first
              const expanded = expandedCandidateGroups.has(entry.key)
              const notations = new Set(
                entry.items.map(({ move }) => move.notation),
              )
              const range = `${first.index + 1} through ${last.index + 1}`
              return (
                <li
                  className={[
                    'candidate-move-group move-type-candidate',
                    first.active ? '' : 'is-undone',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={entry.key}
                >
                  <span className="move-number">
                    {first.index + 1}–{last.index + 1}
                  </span>
                  <code>
                    {notations.size === 1
                      ? first.move.notation
                      : `${notations.size} cells`}
                  </code>
                  <button
                    aria-expanded={expanded}
                    aria-label={`${expanded ? 'Collapse' : 'Expand'} candidate moves ${range}`}
                    className="candidate-group-toggle"
                    onClick={() =>
                      setExpandedCandidateGroups((current) => {
                        const next = new Set(current)
                        if (expanded) next.delete(entry.key)
                        else next.add(entry.key)
                        return next
                      })
                    }
                    type="button"
                  >
                    <span aria-hidden="true" className="candidate-group-chevron">
                      ›
                    </span>
                    <strong>Candidate changes</strong>
                    <small>{entry.items.length} moves</small>
                  </button>
                  {expanded && (
                    <ol
                      aria-label={`Candidate moves ${range}`}
                      className="candidate-move-details"
                    >
                      {[...entry.items].reverse().map((item) => (
                        <MoveRow
                          compact
                          item={item}
                          key={moveKey(item)}
                          state={state}
                        />
                      ))}
                    </ol>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <nav aria-label="Sidebar shortcuts" className="sidebar-dock">
        <button
          aria-label="Help"
          onClick={() => setHelpOpen(true)}
          type="button"
        >
          <span aria-hidden="true">?</span>
        </button>
        <button
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
          type="button"
        >
          <span aria-hidden="true" className="settings-icon">⚙</span>
        </button>
      </nav>

      {resetOpen &&
        createPortal(
          <div className="modal-backdrop">
          <div
            aria-labelledby="reset-game-title"
            aria-modal="true"
            className="confirmation-modal"
            role="dialog"
          >
            <h2 id="reset-game-title">Reset this puzzle?</h2>
            <p>All entries, candidates, and move history will be cleared.</p>
            <div className="modal-actions">
              <button onClick={() => setResetOpen(false)} type="button">
                Cancel
              </button>
              <button
                className="danger-button"
                onClick={() => {
                  state.restart()
                  setResetOpen(false)
                }}
                type="button"
              >
                Reset puzzle
              </button>
            </div>
          </div>
          </div>,
          document.body,
        )}

      {settingsOpen &&
        createPortal(
          <div className="modal-backdrop">
            <div
              aria-labelledby="settings-title"
              aria-modal="true"
              className="confirmation-modal settings-modal"
              role="dialog"
            >
              <h2 id="settings-title">Settings</h2>
              <p>Adjust board display and solving assists.</p>
              <div className="settings-list">
                <label>
                  <span>
                    <strong>Highlight peers</strong>
                    <small>Shade cells in the same row, column, and box.</small>
                  </span>
                  <input
                    aria-label="Highlight peers"
                    checked={settings.highlightPeers}
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        highlightPeers: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                </label>
                <label>
                  <span>
                    <strong>Highlight matching numbers</strong>
                    <small>Shade other cells containing the selected value.</small>
                  </span>
                  <input
                    aria-label="Highlight matching numbers"
                    checked={settings.highlightMatching}
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        highlightMatching: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                </label>
                <label>
                  <span>
                    <strong>Show remaining counts</strong>
                    <small>Display how many of each value remain above the keypad.</small>
                  </span>
                  <input
                    aria-label="Show remaining counts"
                    checked={settings.showRemainingCounts}
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        showRemainingCounts: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                </label>
                <label>
                  <span>
                    <strong>Auto-remove peer candidates</strong>
                    <small>Clear a placed value from candidates in the same row, column, and box.</small>
                  </span>
                  <input
                    aria-label="Auto-remove peer candidates"
                    checked={settings.autoRemoveCandidates}
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        autoRemoveCandidates: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                </label>
                <label>
                  <span>
                    <strong>Prevent conflicting entries</strong>
                    <small>Block values already present in the same row, column, or box.</small>
                  </span>
                  <input
                    aria-label="Prevent conflicting entries"
                    checked={
                      settings.preventGivenContradictions &&
                      settings.preventAllContradictions
                    }
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        preventGivenContradictions: event.target.checked,
                        preventAllContradictions: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button onClick={() => setSettingsOpen(false)} type="button">
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {helpOpen &&
        createPortal(
          <div className="modal-backdrop">
            <div
              aria-labelledby="help-title"
              aria-modal="true"
              className="confirmation-modal help-modal"
              role="dialog"
            >
              <h2 id="help-title">How to play</h2>
              <p>Fill every row, column, and box without repeating a symbol.</p>
              <ol className="help-steps">
                <li>
                  <strong>Choose a puzzle</strong>
                  <span>Use New Game to select a board size and difficulty.</span>
                </li>
                <li>
                  <strong>Fill the board</strong>
                  <span>
                    Select an empty cell, then use the number pad or keyboard
                    to enter its value.
                  </span>
                </li>
                <li>
                  <strong>Add candidates</strong>
                  <span>
                    Use the candidate buttons in a selected empty cell, or
                    hold Shift while typing a symbol.
                  </span>
                </li>
                <li>
                  <strong>Check your work</strong>
                  <span>
                    Use Check Candidates for notes, or Hint when you need the
                    next value.
                  </span>
                </li>
                <li>
                  <strong>Correct mistakes</strong>
                  <span>
                    Use Erase, Undo, Redo, or Reset. Flag uncertain moves to
                    return to them later.
                  </span>
                </li>
                <li>
                  <strong>Save your progress</strong>
                  <span>
                    Your current game saves in this browser automatically.
                    Save Game also downloads a file you can restore later.
                  </span>
                </li>
              </ol>
              <div className="modal-actions">
                <button onClick={() => setHelpOpen(false)} type="button">
                  Got it
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </aside>
  )
}

function MoveRow({
  item: { move, index, active },
  state,
  compact = false,
}: Readonly<{
  item: TimelineMove
  state: GameState
  compact?: boolean
}>) {
  const className = [
    `move-type-${moveType(move)}`,
    active ? '' : 'is-undone',
    active && move.isGuess ? 'is-guess' : '',
    compact ? 'candidate-move-detail' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={className}>
      <span className="move-number">{index + 1}</span>
      <code>{move.notation}</code>
      <span>{move.description}</span>
      <div className="move-actions">
        {active ? (
          <>
            <button
              aria-label={`${move.isGuess ? 'Unflag' : 'Flag'} move ${index + 1} as guess`}
              aria-pressed={move.isGuess === true}
              className={move.isGuess ? 'guess-flag active' : 'guess-flag'}
              onClick={() => state.toggleGuess(index)}
              title={move.isGuess ? 'Remove guess flag' : 'Flag as guess'}
              type="button"
            >
              ⚑
            </button>
            {move.isGuess && (
              <button
                aria-label={`Return to guess at move ${index + 1}`}
                className="return-guess"
                onClick={() => state.returnToGuess(index)}
                type="button"
              >
                Return
              </button>
            )}
          </>
        ) : (
          <span className="branch-state">
            {move.isGuess ? '⚑ ' : ''}Undone
          </span>
        )}
      </div>
    </li>
  )
}

function compactCandidateMoves(moves: TimelineMove[]): MoveTimelineEntry[] {
  const entries: MoveTimelineEntry[] = []
  let index = 0
  while (index < moves.length) {
    const item = moves[index]
    if (moveType(item.move) !== 'candidate' || item.move.isGuess) {
      entries.push({ kind: 'move', item })
      index += 1
      continue
    }

    const items = [item]
    let nextIndex = index + 1
    while (nextIndex < moves.length) {
      const next = moves[nextIndex]
      if (
        next.active !== item.active ||
        next.move.isGuess ||
        moveType(next.move) !== 'candidate'
      ) {
        break
      }
      items.push(next)
      nextIndex += 1
    }

    if (items.length === 1) entries.push({ kind: 'move', item })
    else {
      const last = items.at(-1) ?? item
      entries.push({
        kind: 'candidate-group',
        key: `candidates-${item.active ? 'active' : 'undone'}-${item.index}-${last.index}`,
        items,
      })
    }
    index = nextIndex
  }
  return entries
}

function moveType(move: MoveRecord): 'candidate' | 'entry' | 'erase' | 'hint' | 'other' {
  if (
    move.description.startsWith('Candidate ') ||
    move.description === 'Cleared candidates'
  ) {
    return 'candidate'
  }
  if (
    move.description.startsWith('Entered ') ||
    move.description.startsWith('Changed ')
  ) {
    return 'entry'
  }
  if (move.description.startsWith('Erased ')) return 'erase'
  if (move.description.startsWith('Hint ')) return 'hint'
  return 'other'
}

function moveKey({ move, index, active }: TimelineMove): string {
  return `${active ? 'active' : 'undone'}-${index}-${move.notation}-${move.description}`
}

function saveFilename(state: GameState, date: Date): string {
  const size = state.boxSize * state.boxSize
  const timestamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  return `sudoku-${size}x${size}-${state.difficulty}-${timestamp}.txt`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDifficulty(difficulty: GameState['difficulty']): string {
  return difficulty[0].toUpperCase() + difficulty.slice(1)
}

function readTextFile(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')))
    reader.addEventListener('error', () =>
      reject(reader.error ?? new Error('Could not read game file.')),
    )
    reader.readAsText(file)
  })
}
