import { useEffect, useState } from 'react'
import type { StoreApi } from 'zustand'
import { useStore } from 'zustand'

import { symbolToDigit } from '../packages/engine/grid'
import { GameControls } from './components/GameControls'
import { GameSidebar } from './components/GameSidebar'
import { SudokuBoard } from './components/SudokuBoard'
import {
  defaultGameHasActiveSave,
  defaultGameStore,
} from './game/defaultGame'
import { generatePuzzleForDifficulty } from './game/difficulty'
import { showErrorToast } from './game/errorToast'
import { DEFAULT_UI_SETTINGS } from './game/uiSettings'
import type { UiSettings } from './game/uiSettings'
import type { Difficulty, GameState } from './state/gameStore'
import './styles.css'

export type InitialWelcome = 'active-game' | 'new-game' | null

type AppProps = Readonly<{
  store?: StoreApi<GameState>
  initialWelcome?: InitialWelcome
}>
type PlayableBoxSize = 3 | 4

export function App({ store = defaultGameStore, initialWelcome }: AppProps) {
  const state = useStore(store)
  const resolvedInitialWelcome = (() => {
    if (initialWelcome !== undefined) return initialWelcome
    if (store !== defaultGameStore) return null
    return defaultGameHasActiveSave ? 'active-game' : 'new-game'
  })()
  const [welcome, setWelcome] = useState<InitialWelcome>(
    resolvedInitialWelcome,
  )
  const [hasResumableGame] = useState(
    resolvedInitialWelcome === 'active-game',
  )
  const [welcomeRevealed, setWelcomeRevealed] = useState(
    resolvedInitialWelcome == null,
  )
  const [newGameOpen, setNewGameOpen] = useState(false)
  const [newGameDifficulty, setNewGameDifficulty] = useState<Difficulty>(
    state.difficulty,
  )
  const [newGameBoxSize, setNewGameBoxSize] = useState<PlayableBoxSize>(
    state.boxSize === 4 ? 4 : 3,
  )
  const [uiSettings, setUiSettings] = useState<UiSettings>(
    DEFAULT_UI_SETTINGS,
  )

  useEffect(() => {
    if (state.contradiction == null) return
    const dismissToast = showErrorToast(state.contradiction.message)
    const highlightTimeout = window.setTimeout(
      () => store.getState().clearContradiction(),
      2400,
    )
    return () => {
      window.clearTimeout(highlightTimeout)
      dismissToast()
    }
  }, [state.contradiction, store])

  useEffect(() => {
    if (welcome == null || welcomeRevealed) return
    const revealTimeout = window.setTimeout(
      () => setWelcomeRevealed(true),
      1_000,
    )
    return () => window.clearTimeout(revealTimeout)
  }, [welcome, welcomeRevealed])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (welcome != null || newGameOpen) return
      const current = store.getState()
      const commandKey = event.ctrlKey || event.metaKey
      if (commandKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) current.redo()
        else current.undo()
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Escape') {
        current.deselect()
        return
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        current.erase()
        return
      }
      if (event.key === ' ') {
        event.preventDefault()
        current.togglePause()
        return
      }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault()
        const size = current.boxSize * current.boxSize
        const selected = current.selected ?? { r: 0, c: 0 }
        const next = { ...selected }
        if (event.key === 'ArrowUp') next.r = Math.max(0, next.r - 1)
        if (event.key === 'ArrowDown') next.r = Math.min(size - 1, next.r + 1)
        if (event.key === 'ArrowLeft') next.c = Math.max(0, next.c - 1)
        if (event.key === 'ArrowRight') next.c = Math.min(size - 1, next.c + 1)
        if (
          current.selected == null ||
          next.r !== current.selected.r ||
          next.c !== current.selected.c
        ) {
          current.selectCell(next)
        }
        return
      }
      try {
        const symbol = event.shiftKey
          ? shiftedCandidateSymbol(event)
          : event.key
        const digit = symbolToDigit(symbol, current.boxSize)
        if (event.shiftKey) {
          if (current.selected != null) {
            event.preventDefault()
            current.toggleCandidate(current.selected, digit)
          }
        } else {
          current.inputDigit(digit)
        }
      } catch {
        // Ignore keys outside the active symbol set.
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [newGameOpen, store, welcome])

  const startGame = (
    difficulty: Difficulty,
    boxSize: PlayableBoxSize,
  ) => {
    const generated = generatePuzzleForDifficulty(
      difficulty,
      Math.random,
      boxSize,
    )
    state.loadGame({ boxSize, ...generated, difficulty })
    setNewGameOpen(false)
    setWelcome(null)
  }

  const openNewGame = () => {
    setNewGameDifficulty(state.difficulty)
    setNewGameBoxSize(state.boxSize === 4 ? 4 : 3)
    setNewGameOpen(true)
  }

  const openWelcomeNewGame = () => {
    setNewGameDifficulty(state.difficulty)
    setNewGameBoxSize(state.boxSize === 4 ? 4 : 3)
    setWelcome('new-game')
  }

  const welcomeOverlay = welcomeRevealed && welcome != null ? (
    <div className="welcome-overlay">
      <section
          aria-labelledby="welcome-title"
          aria-modal="true"
          className="welcome-card"
          role="dialog"
        >
          {welcome === 'active-game' ? (
            <>
              <h1 id="welcome-title">Sudoku</h1>
              <p className="welcome-copy">
                Continue your saved puzzle or begin with a fresh board.
              </p>
              <div className="welcome-choice-actions">
                <button
                  className="primary-button welcome-primary-action"
                  onClick={() => setWelcome(null)}
                  type="button"
                >
                  Resume Game
                </button>
                <button
                  className="welcome-secondary-action"
                  onClick={openWelcomeNewGame}
                  type="button"
                >
                  New Game
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 id="welcome-title">Start a new game</h1>
              <p className="welcome-copy">
                Choose the board that feels right for today.
              </p>
              <div className="welcome-new-game-options">
                <label>
                  <span>Board size</span>
                  <select
                    aria-label="Board size"
                    onChange={(event) =>
                      setNewGameBoxSize(
                        Number(event.target.value) as PlayableBoxSize,
                      )
                    }
                    value={newGameBoxSize}
                  >
                    <option value="3">Standard · 9×9</option>
                    <option value="4">Hexadecimal · 16×16</option>
                  </select>
                </label>
                <label>
                  <span>Difficulty</span>
                  <select
                    aria-label="Difficulty"
                    onChange={(event) =>
                      setNewGameDifficulty(event.target.value as Difficulty)
                    }
                    value={newGameDifficulty}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </select>
                </label>
              </div>
              <div className="welcome-new-game-actions">
                {hasResumableGame && (
                  <button
                    className="welcome-back-action"
                    onClick={() => setWelcome('active-game')}
                    type="button"
                  >
                    Back
                  </button>
                )}
                <button
                  className="primary-button welcome-start-action"
                  onClick={() =>
                    startGame(newGameDifficulty, newGameBoxSize)
                  }
                  type="button"
                >
                  Start New Game
                </button>
              </div>
            </>
          )}
      </section>
    </div>
  ) : null

  return (
    <main className="app-shell">
      {welcomeOverlay}

      {newGameOpen && (
        <div className="modal-backdrop">
          <div
            aria-labelledby="new-game-title"
            aria-modal="true"
            className="confirmation-modal new-game-modal"
            role="dialog"
          >
            <h2 id="new-game-title">Start a new game</h2>
            <p>Choose a difficulty. Your current game will be replaced.</p>
            <label>
              <span>Board size</span>
              <select
                aria-label="Board size"
                onChange={(event) =>
                  setNewGameBoxSize(Number(event.target.value) as PlayableBoxSize)
                }
                value={newGameBoxSize}
              >
                <option value="3">Standard · 9×9</option>
                <option value="4">Hexadecimal · 16×16</option>
              </select>
            </label>
            <label>
              <span>Difficulty</span>
              <select
                aria-label="Difficulty"
                onChange={(event) =>
                  setNewGameDifficulty(event.target.value as Difficulty)
                }
                value={newGameDifficulty}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </label>
            <div className="modal-actions">
              <button onClick={() => setNewGameOpen(false)} type="button">
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={() => startGame(newGameDifficulty, newGameBoxSize)}
                type="button"
              >
                Start new game
              </button>
            </div>
          </div>
        </div>
      )}

      <section
        className={`game-layout${welcome != null ? ' is-welcome-locked' : ''}`}
        inert={welcome != null}
      >
        <GameSidebar
          celebrateNewGame={state.status === 'won'}
          onNewGame={openNewGame}
          onSettingsChange={setUiSettings}
          settings={uiSettings}
          state={state}
        />
        <div className="play-area">
          <SudokuBoard settings={uiSettings} state={state} />
        </div>
        <GameControls
          showRemainingCounts={uiSettings.showRemainingCounts}
          state={state}
        />
      </section>

    </main>
  )
}

function shiftedCandidateSymbol(event: KeyboardEvent): string {
  const digitMatch = /^Digit([1-9])$/.exec(event.code)
  return digitMatch?.[1] ?? event.key
}
