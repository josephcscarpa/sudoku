import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { digitToSymbol } from '../packages/engine/grid'
import { encodeGameExport } from './game/gameTransfer'
import { createGameStore } from './state/gameStore'

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

describe('App', () => {
  it('offers Resume Game for an active save and preserves it while welcome is open', async () => {
    vi.useFakeTimers()
    try {
      const store = createGameStore({ boxSize: 2, puzzle, solution })
      store.getState().selectCell({ r: 0, c: 0 })
      store.getState().tick(12_000)
      const { App } = await import('./App')

      const { container } = render(
        <App initialWelcome="active-game" store={store} />,
      )

      const board = screen.getByRole('grid', { name: 'Sudoku board' })
      expect(board).toBeVisible()
      expect(
        screen.queryByRole('dialog', { name: 'Sudoku' }),
      ).not.toBeInTheDocument()

      fireEvent.keyDown(window, { key: '1' })
      expect(store.getState().cells[0][0].value).toBeNull()

      act(() => vi.advanceTimersByTime(999))
      expect(
        screen.queryByRole('dialog', { name: 'Sudoku' }),
      ).not.toBeInTheDocument()

      act(() => vi.advanceTimersByTime(1))
      const welcomeDialog = screen.getByRole('dialog', {
        name: 'Sudoku',
      })
      expect(welcomeDialog).toBeVisible()
      expect(container.querySelector('.welcome-brand-mark')).toBeNull()
      expect(
        within(welcomeDialog).queryByText('Your puzzle is waiting'),
      ).not.toBeInTheDocument()
      expect(board).toBeVisible()
      expect(
        within(welcomeDialog).getByRole('button', { name: 'Resume Game' }),
      ).toBeVisible()
      expect(
        within(welcomeDialog).getByRole('button', { name: 'New Game' }),
      ).toBeVisible()

      fireEvent.click(
        within(welcomeDialog).getByRole('button', { name: 'Resume Game' }),
      )

      expect(screen.getByRole('grid', { name: 'Sudoku board' })).toBeVisible()
      expect(store.getState().selected).toEqual({ r: 0, c: 0 })
      expect(store.getState().elapsedMs).toBe(12_000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('opens the New Game flow over the active board', async () => {
    vi.useFakeTimers()
    try {
      const store = createGameStore({ boxSize: 2, puzzle, solution })
      const { App } = await import('./App')

      render(<App initialWelcome="active-game" store={store} />)
      act(() => vi.advanceTimersByTime(1_000))

      const welcomeDialog = screen.getByRole('dialog', {
        name: 'Sudoku',
      })
      fireEvent.click(
        within(welcomeDialog).getByRole('button', { name: 'New Game' }),
      )

      expect(
        screen.getByRole('dialog', { name: 'Start a new game' }),
      ).toBeVisible()
      expect(screen.queryByText('A quiet challenge')).not.toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: 'Board size' })).toBeVisible()
      expect(screen.getByRole('combobox', { name: 'Difficulty' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Start New Game' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Back' })).toBeVisible()
      expect(screen.getByRole('grid', { name: 'Sudoku board' })).toBeVisible()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows only the New Game flow when there is no active save', async () => {
    vi.useFakeTimers()
    try {
      const store = createGameStore({ boxSize: 2, puzzle, solution })
      const { App } = await import('./App')

      render(<App initialWelcome="new-game" store={store} />)
      act(() => vi.advanceTimersByTime(1_000))

      expect(
        screen.getByRole('dialog', { name: 'Start a new game' }),
      ).toBeVisible()
      expect(
        screen.queryByRole('button', { name: 'Resume Game' }),
      ).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Start New Game' })).toBeVisible()
      expect(screen.getByRole('grid', { name: 'Sudoku board' })).toBeVisible()
    } finally {
      vi.useRealTimers()
    }
  })

  it('starts the selected game from the welcome flow', async () => {
    vi.useFakeTimers()
    try {
      const store = createGameStore({ boxSize: 2, puzzle, solution })
      const { App } = await import('./App')

      render(<App initialWelcome="new-game" store={store} />)
      act(() => vi.advanceTimersByTime(1_000))

      fireEvent.click(screen.getByRole('button', { name: 'Start New Game' }))

      expect(screen.getByRole('grid', { name: 'Sudoku board' })).toBeVisible()
      expect(
        screen.queryByRole('dialog', { name: 'Start a new game' }),
      ).not.toBeInTheDocument()
      expect(store.getState().boxSize).toBe(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it('opens the New Game flow on page load when no game is saved', async () => {
    vi.useFakeTimers()
    try {
      const { App } = await import('./App')

      render(<App />)

      expect(screen.getByRole('grid', { name: 'Sudoku board' })).toBeVisible()
      expect(
        screen.queryByRole('dialog', { name: 'Start a new game' }),
      ).not.toBeInTheDocument()

      act(() => vi.advanceTimersByTime(1_000))
      expect(
        screen.getByRole('dialog', { name: 'Start a new game' }),
      ).toBeVisible()
      expect(screen.getByRole('button', { name: 'Start New Game' })).toBeVisible()
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
      expect(screen.queryByText('Mistakes')).not.toBeInTheDocument()
      expect(screen.queryByText('Time')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('chooses difficulty through New game and confirms puzzle reset', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)

    expect(screen.queryByRole('combobox', { name: 'Difficulty' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /New game/i }))
    expect(screen.getByRole('dialog', { name: 'Start a new game' })).toBeVisible()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Difficulty' }),
      'hard',
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Board size' }),
      '4',
    )
    await user.click(screen.getByRole('button', { name: 'Start new game' }))
    expect(store.getState().difficulty).toBe('hard')
    expect(store.getState().boxSize).toBe(4)
    expect(store.getState().cells).toHaveLength(16)

    const generated = store.getState()
    const r = generated.cells.findIndex((row) =>
      row.some((cell) => !cell.given),
    )
    const c = generated.cells[r].findIndex((cell) => !cell.given)
    const digit = generated.solution[r][c]
    const symbol = digitToSymbol(digit, generated.boxSize)
    await user.click(
      screen.getByRole('button', {
        name: `Row ${r + 1} column ${c + 1}, empty`,
      }),
    )
    const hexEditor = screen.getByRole('group', {
      name: `Candidates for selected cell R${r + 1}C${c + 1}`,
    })
    expect(
      within(hexEditor).getAllByRole('button', { name: /candidate/i }),
    ).toHaveLength(16)
    await user.click(screen.getByRole('button', { name: new RegExp(`Enter ${symbol}`) }))
    expect(store.getState().moves).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('dialog', { name: 'Reset this puzzle?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Reset this puzzle?' })).not.toBeInTheDocument()
    expect(store.getState().moves).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    await user.click(screen.getByRole('button', { name: 'Reset puzzle' }))
    expect(store.getState().moves).toEqual([])
  })

  it('highlights a filled value and double-click de-fills without losing candidates', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)

    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    const cellEditor = screen.getByRole('region', {
      name: 'Selected cell editor',
    })
    const candidateEditor = within(cellEditor).getByRole('group', {
      name: 'Candidates for selected cell R1C1',
    })
    await user.click(
      within(candidateEditor).getByRole('button', {
        name: 'Add candidate 2 in enlarged cell',
      }),
    )
    await user.keyboard('{Escape}')
    expect(store.getState().selected).toBeNull()
    expect(store.getState().cells[0][0].notes).toEqual([2])
    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    const oneKey = screen.getByRole('button', { name: /Enter 1/ })
    await user.click(oneKey)

    expect(oneKey).toHaveAttribute('aria-pressed', 'true')
    await user.dblClick(oneKey)
    expect(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', {
        name: 'Remove candidate 2 at row 1 column 1',
      }),
    ).toBeVisible()

    await user.click(oneKey)
    const filledCell = screen.getByRole('button', {
      name: 'Row 1 column 1, 1',
    })
    await user.dblClick(filledCell)
    expect(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    ).toBeVisible()
    expect(store.getState().cells[0][0].notes).toEqual([2])
  })

  it('opens Settings from the sidebar dock and applies display toggles', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)

    const oneKey = screen.getByRole('button', { name: /Enter 1/ })
    expect(oneKey).toHaveTextContent('1 left')
    await user.click(screen.getByRole('button', { name: 'Settings' }))

    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(
      within(dialog).getByRole('checkbox', { name: 'Highlight peers' }),
    ).toBeChecked()
    expect(
      within(dialog).getByRole('checkbox', {
        name: 'Auto-remove peer candidates',
      }),
    ).toBeChecked()
    expect(
      within(dialog).getByRole('checkbox', {
        name: 'Prevent conflicting entries',
      }),
    ).toBeChecked()
    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Show remaining counts' }),
    )
    await user.click(
      within(dialog).getByRole('checkbox', {
        name: 'Prevent conflicting entries',
      }),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Done' }))

    expect(oneKey).not.toHaveTextContent('left')
    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 2, empty' }),
    )
    await user.click(oneKey)
    expect(
      screen.getByRole('button', { name: 'Row 1 column 2, 1' }),
    ).toBeVisible()
  })

  it('opens website instructions from the help icon next to Settings', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)

    const shortcuts = screen.getByRole('navigation', {
      name: 'Sidebar shortcuts',
    })
    const helpButton = within(shortcuts).getByRole('button', { name: 'Help' })
    const settingsButton = within(shortcuts).getByRole('button', {
      name: 'Settings',
    })
    expect(helpButton.nextElementSibling).toBe(settingsButton)

    await user.click(helpButton)

    const dialog = screen.getByRole('dialog', { name: 'How to play' })
    expect(within(dialog).getByText('Choose a puzzle')).toBeVisible()
    expect(within(dialog).getByText('Fill the board')).toBeVisible()
    expect(within(dialog).getByText('Add candidates')).toBeVisible()
    expect(within(dialog).getByText('Save your progress')).toBeVisible()

    await user.click(within(dialog).getByRole('button', { name: 'Got it' }))
    expect(
      screen.queryByRole('dialog', { name: 'How to play' }),
    ).not.toBeInTheDocument()
  })

  it('explains and highlights a blocked contradiction', async () => {
    const user = userEvent.setup()
    const contradictionPuzzle: (number | null)[][] = solution.map((row) =>
      row.map(() => null),
    )
    contradictionPuzzle[0][1] = 1
    const store = createGameStore({
      boxSize: 2,
      puzzle: contradictionPuzzle,
      solution,
    })
    const { App } = await import('./App')

    render(<App store={store} />)

    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    await user.keyboard('1')

    expect(screen.getByRole('alert')).toHaveTextContent(
      '1 already appears in row 1 at R1C2.',
    )
    expect(
      screen.getByRole('button', {
        name: 'Row 1 column 1, attempted 1 conflicts',
      }).closest('.sudoku-cell'),
    ).toHaveClass('is-rejected')
    expect(
      screen.getByRole('button', {
        name: 'Row 1 column 2, 1, given',
      }).closest('.sudoku-cell'),
    ).toHaveClass('is-conflict')
    expect(store.getState().cells[0][0].value).toBeNull()
  })

  it('temporarily replaces a filled value with the rejected attempted digit', async () => {
    const user = userEvent.setup()
    const emptyPuzzle = solution.map((row) => row.map(() => null))
    const store = createGameStore({ boxSize: 2, puzzle: emptyPuzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)

    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    await user.keyboard('1')
    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 2, empty' }),
    )
    await user.keyboard('2')
    await user.keyboard('1')

    const rejectedCell = screen.getByRole('button', {
      name: 'Row 1 column 2, attempted 1 conflicts',
    })
    expect(rejectedCell.querySelector('.contradiction-ghost')).toHaveTextContent('1')
    expect(rejectedCell.querySelector('.player-value')).not.toBeInTheDocument()
    expect(store.getState().cells[0][1].value).toBe(2)
  })

  it('puts fill-in numbers before the temporary candidate pad and hides it after filling', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)

    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    const numberEntry = screen.getByRole('region', { name: 'Fill in numbers' })
    const candidateEditor = screen.getByRole('region', {
      name: 'Selected cell editor',
    })
    expect(
      numberEntry.compareDocumentPosition(candidateEditor) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    await user.click(screen.getByRole('button', { name: /Enter 1/ }))

    expect(
      screen.queryByRole('region', { name: 'Selected cell editor' }),
    ).not.toBeInTheDocument()
  })

  it('releases number-pad focus so keyboard replacement stays frictionless', async () => {
    const user = userEvent.setup()
    const emptyPuzzle = solution.map((row) => row.map(() => null))
    const store = createGameStore({ boxSize: 2, puzzle: emptyPuzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)
    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    const oneKey = screen.getByRole('button', { name: /Enter 1/ })
    await user.click(oneKey)

    expect(document.activeElement).not.toBe(oneKey)
    await user.keyboard('2')
    expect(store.getState().cells[0][0].value).toBe(2)
  })

  it('uses the normal UI font on board candidates and handwriting in the large panel', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)
    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    const boardCandidate = within(
      screen.getByRole('grid', { name: 'Sudoku board' }),
    ).getByRole('button', { name: 'Add candidate 1 at row 1 column 1' })
    const largeCandidate = screen.getByRole('button', {
      name: 'Add candidate 1 in enlarged cell',
    })

    expect(boardCandidate).toHaveClass('standard-candidate')
    expect(largeCandidate).toHaveClass('handwritten-candidate')
  })

  it('marks active candidates red when the digit already exists in a peer unit', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)
    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Add candidate 1 in enlarged cell' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Add candidate 2 in enlarged cell' }),
    )

    const board = screen.getByRole('grid', { name: 'Sudoku board' })
    const legalBoardCandidate = within(board).getByRole('button', {
      name: 'Remove candidate 1 at row 1 column 1',
    })
    const conflictingBoardCandidate = within(board).getByRole('button', {
      name: 'Remove candidate 2 at row 1 column 1',
    })
    const conflictingPadCandidate = screen.getByRole('button', {
      name: 'Remove candidate 2 in enlarged cell',
    })

    expect(legalBoardCandidate).not.toHaveClass('is-candidate-conflict')
    expect(conflictingBoardCandidate).toHaveClass('is-candidate-conflict')
    expect(conflictingBoardCandidate).toHaveAttribute('aria-invalid', 'true')
    expect(conflictingPadCandidate).toHaveClass('is-candidate-conflict')
    expect(conflictingPadCandidate).toHaveAttribute('aria-invalid', 'true')
  })

  it('inspects live missing symbols for rows, columns, and boxes', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)
    const rowControls = screen.getByRole('group', {
      name: 'Row missing-symbol controls',
    })
    const columnControls = screen.getByRole('group', {
      name: 'Column missing-symbol controls',
    })
    const boxControls = screen.getByRole('group', {
      name: 'Box missing-symbol controls',
    })
    expect(within(rowControls).getAllByRole('button')).toHaveLength(4)
    expect(within(columnControls).getAllByRole('button')).toHaveLength(4)
    expect(within(boxControls).getAllByRole('button')).toHaveLength(4)

    await user.click(
      screen.getByRole('button', { name: 'Show missing symbols for row 1' }),
    )
    let panel = screen.getByRole('dialog', {
      name: 'Missing symbols for row 1',
    })
    expect(
      within(panel)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['1', '2'])
    expect(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' })
        .closest('.sudoku-cell'),
    ).toHaveClass('is-unit-inspected')

    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    expect(
      screen.queryByRole('dialog', { name: 'Missing symbols for row 1' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Enter 1/ }))
    await user.click(
      screen.getByRole('button', { name: 'Show missing symbols for row 1' }),
    )
    panel = screen.getByRole('dialog', {
      name: 'Missing symbols for row 1',
    })
    expect(
      within(panel)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['2'])

    await user.click(
      screen.getByRole('button', {
        name: 'Show missing symbols for column 1',
      }),
    )
    panel = screen.getByRole('dialog', {
      name: 'Missing symbols for column 1',
    })
    expect(within(panel).getByText('All symbols placed.')).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: 'Show missing symbols for box 1' }),
    )
    panel = screen.getByRole('dialog', {
      name: 'Missing symbols for box 1',
    })
    expect(
      within(panel)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['2'])

    await user.click(
      screen.getByRole('button', { name: 'Show missing symbols for row 2' }),
    )
    panel = screen.getByRole('dialog', {
      name: 'Missing symbols for row 2',
    })
    expect(within(panel).getByText('All symbols placed.')).toBeVisible()
    await user.click(
      screen.getByRole('button', { name: 'Show missing symbols for row 2' }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('places Check Candidates under the number pad and shows a red shake on failure', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)
    const numberPad = screen.getByRole('group', { name: 'Number pad' })
    const checkButton = screen.getByRole('button', {
      name: 'Check Candidates',
    })

    expect(numberPad.nextElementSibling).toContainElement(checkButton)
    await user.click(checkButton)

    const toast = screen.getByText(
      'Some empty cells are missing their solution candidate.',
    )
    expect(toast).toHaveAttribute('role', 'alert')
    expect(toast).toHaveAttribute('data-toast-tone', 'error')
    expect(checkButton.closest('.candidate-check-feedback')).toHaveClass(
      'is-error',
    )
  })

  it('shows a green nod and sparkles when every solution remains in the candidates', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    store.getState().toggleCandidate({ r: 0, c: 0 }, 1)
    store.getState().toggleCandidate({ r: 0, c: 1 }, 2)
    const { App } = await import('./App')

    const { container } = render(<App store={store} />)
    const checkButton = screen.getByRole('button', {
      name: 'Check Candidates',
    })
    await user.click(checkButton)

    const toast = screen.getByText(
      'Candidates check out — every solution is still possible!',
    )
    expect(toast).toHaveAttribute('role', 'status')
    expect(toast).toHaveAttribute('data-toast-tone', 'success')
    expect(checkButton.closest('.candidate-check-feedback')).toHaveClass(
      'is-success',
    )
    expect(container.querySelector('.candidate-check-sparkles')).toBeVisible()
  })

  it('marks and animates a number when its final copy is placed', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)

    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    await user.click(screen.getByRole('button', { name: /Enter 1/ }))

    expect(screen.getByRole('button', { name: /Enter 1, 0 remaining/ }))
      .toHaveClass('is-complete', 'is-just-completed')
  })

  it('shows current difficulty and Save Game / Restore Game beneath New Game', async () => {
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)

    const newGame = screen.getByRole('button', { name: 'New Game' })
    expect(newGame.nextElementSibling).toHaveTextContent('Easy')
    expect(screen.getByRole('region', { name: 'Save and restore game' }))
      .toBeVisible()
    expect(screen.getByRole('button', { name: 'Save Game' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Restore Game' })).toBeVisible()
  })

  it('includes local date and time in the saved game filename', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 7, 14, 5, 6))
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: () => 'blob:sudoku-save',
    })
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: () => undefined,
    })
    let downloadedAs = ''
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function captureDownload(this: HTMLAnchorElement) {
        downloadedAs = this.download
      })

    try {
      const store = createGameStore({ boxSize: 2, puzzle, solution })
      const { App } = await import('./App')
      const { container } = render(<App store={store} />)

      fireEvent.click(
        container.querySelector('.transfer-actions button') as HTMLButtonElement,
      )

      expect(downloadedAs).toBe(
        'sudoku-4x4-easy-2026-08-07_14-05-06.txt',
      )
    } finally {
      click.mockRestore()
      vi.useRealTimers()
    }
  })

  it('reveals the solved board and pulses New Game after completion', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)

    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    await user.click(screen.getByRole('button', { name: /Enter 1/ }))
    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 2, empty' }),
    )
    await user.click(screen.getByRole('button', { name: /Enter 2/ }))

    const completion = screen.getByRole('status', {
      name: 'Puzzle completed',
    })
    expect(completion).toHaveTextContent('Puzzle Completed!')
    expect(completion).toHaveStyle('--completion-hold: 2.5s')
    expect(screen.getByRole('button', { name: 'New Game' })).toHaveClass(
      'is-celebrating',
    )

    fireEvent.animationEnd(completion)

    expect(
      screen.queryByRole('status', { name: 'Puzzle completed' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'Sudoku board' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Row 1 column 1, 1' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Row 1 column 2, 2' })).toBeVisible()
  })

  it('compacts candidate moves while keeping flagged candidate returns visible', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)

    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Add candidate 1 in enlarged cell',
      }),
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Add candidate 2 in enlarged cell',
      }),
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Add candidate 3 in enlarged cell',
      }),
    )

    const expand = screen.getByRole('button', {
      name: 'Expand candidate moves 1 through 3',
    })
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Candidate 2 added')).not.toBeInTheDocument()

    await user.click(expand)

    expect(expand).toHaveAttribute('aria-expanded', 'true')
    const candidateMove = screen.getByText('Candidate 2 added').closest('li')
    expect(candidateMove).toHaveClass('move-type-candidate')
    await user.click(
      within(candidateMove as HTMLElement).getByRole('button', {
        name: 'Flag move 2 as guess',
      }),
    )

    const returnButton = screen.getByRole('button', {
      name: 'Return to guess at move 2',
    })
    expect(returnButton).toBeVisible()
    expect(returnButton).toHaveClass('return-guess')
    expect(returnButton.closest('li')).toHaveClass(
      'is-guess',
      'move-type-candidate',
    )
  })

  it('plays values, keyboard input, and fixed-position candidates', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)

    expect(screen.getByRole('grid', { name: 'Sudoku board' })).toBeVisible()
    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    const oneKey = screen.getByRole('button', { name: /Enter 1/ })
    expect(oneKey).toHaveTextContent('1 left')
    const count = oneKey.querySelector('small')
    const digit = oneKey.querySelector('span')
    expect(
      (count?.compareDocumentPosition(digit as Node) ?? 0) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    await user.click(oneKey)
    expect(
      screen.getByRole('button', { name: 'Row 1 column 1, 1' }),
    ).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 2, empty' }),
    )
    await user.keyboard('2')
    expect(
      screen.getByRole('button', { name: 'Row 1 column 2, 2' }),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('Entered 2')).toBeVisible()
    expect(screen.getByText('Undone')).toBeVisible()
    const board = screen.getByRole('grid', { name: 'Sudoku board' })
    const candidate = within(board).getByRole('button', {
      name: 'Add candidate 2 at row 1 column 2',
    })
    expect(candidate).toHaveTextContent('2')
    await user.click(candidate)
    expect(within(board).getByRole('button', {
      name: 'Remove candidate 2 at row 1 column 2',
    })).toBeVisible()
    expect(screen.queryByText('Entered 2')).not.toBeInTheDocument()
    expect(screen.queryByText('Undone')).not.toBeInTheDocument()

    expect(screen.queryByRole('button', { name: 'Notes' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save Game' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Restore Game' })).toBeVisible()
    expect(
      within(screen.getByRole('list', { name: 'Move stack' })).getByText(
        'R1C2',
      ),
    ).toBeVisible()
    expect(screen.getByText('Candidate 2 added')).toBeVisible()
    await user.click(
      screen.getByRole('button', { name: 'Flag move 2 as guess' }),
    )
    expect(
      screen.getByRole('button', { name: 'Return to guess at move 2' }),
    ).toBeVisible()

    const exportText = encodeGameExport(store.getState())
    const file = new File([exportText], 'sudoku-game.txt', {
      type: 'text/plain',
    })
    await user.upload(screen.getByLabelText('Choose saved game file'), file)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Game restored successfully.',
    )
    expect(
      screen.getByRole('button', { name: 'Return to guess at move 2' }),
    ).toBeVisible()
    await user.click(
      screen.getByRole('button', { name: 'Return to guess at move 2' }),
    )
    expect(screen.getByText('Entered 1')).toBeVisible()
    expect(screen.getByText('Candidate 2 added')).toBeVisible()
    expect(screen.getByText(/Undone/)).toBeVisible()
  })

  it('uses Ctrl or Cmd+Z to undo and Shift+Ctrl or Cmd+Z to redo', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)
    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    await user.keyboard('1')

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(store.getState().cells[0][0].value).toBeNull()

    fireEvent.keyDown(window, { key: 'Z', metaKey: true, shiftKey: true })
    expect(store.getState().cells[0][0].value).toBe(1)
  })

  it('toggles candidates with Shift+symbols and decodes shifted digit punctuation', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ boxSize: 2, puzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)
    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )

    fireEvent.keyDown(window, {
      code: 'Digit2',
      key: '@',
      shiftKey: true,
    })
    expect(store.getState().cells[0][0].notes).toEqual([2])

    fireEvent.keyDown(window, {
      code: 'Digit2',
      key: '@',
      shiftKey: true,
    })
    expect(store.getState().cells[0][0].notes).toEqual([])
  })

  it('supports Shift+A through Shift+G as Hexadoku candidate toggles', async () => {
    const size = 16
    const hexSolution = Array.from({ length: size }, (_, r) =>
      Array.from(
        { length: size },
        (_, c) => ((r * 4 + Math.floor(r / 4) + c) % size) + 1,
      ),
    )
    const hexPuzzle = hexSolution.map((row) => row.map(() => null))
    const store = createGameStore({
      boxSize: 4,
      puzzle: hexPuzzle,
      solution: hexSolution,
    })
    const { App } = await import('./App')

    render(<App store={store} />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    fireEvent.keyDown(window, { code: 'KeyA', key: 'A', shiftKey: true })
    fireEvent.keyDown(window, { code: 'KeyG', key: 'G', shiftKey: true })

    expect(store.getState().cells[0][0].notes).toEqual([10, 16])
  })

  it('replaces the selected fill-in when another symbol is pressed', async () => {
    const user = userEvent.setup()
    const emptyPuzzle = solution.map((row) => row.map(() => null))
    const store = createGameStore({ boxSize: 2, puzzle: emptyPuzzle, solution })
    const { App } = await import('./App')

    render(<App store={store} />)
    await user.click(
      screen.getByRole('button', { name: 'Row 1 column 1, empty' }),
    )
    await user.keyboard('2')
    await user.keyboard('1')

    expect(store.getState().cells[0][0].value).toBe(1)
    expect(store.getState().moves.at(-1)?.description).toBe('Changed 2 to 1')
  })
})
