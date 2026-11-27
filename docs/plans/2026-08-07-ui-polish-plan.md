# Plan: Sudoku UI Polish and Contradiction Feedback

**Goal**: Improve the game's control hierarchy and whitespace while making blocked contradictions and completed digits clear and satisfying.
**Architecture**: Add deterministic transient contradiction state to the Zustand store, render it through the board, trigger the existing toast at the React boundary, and use semantic CSS states for visual polish and motion.
**Tech Stack**: React 19, TypeScript, Zustand, CSS, Vitest, Testing Library.

## Dependency order

| Group | Steps | Dependencies |
|---|---|---|
| 1 | Store contradiction regression test | None |
| 2 | Store contradiction state implementation | Group 1 |
| 3 | UI behavior regression tests | Group 2 |
| 4 | React component layout and feedback implementation | Group 3 |
| 5 | CSS polish and animations | Group 4 |
| 6 | Full verification | Groups 1–5 |

## Step 1: Specify rejected contradiction behavior

**Files:** `src/state/gameStore.test.ts`, `src/state/gameStore.ts`

Add a failing store test proving an illegal input remains uncommitted but records the attempted cell, matching peer, digit, and row/column/box explanation. Run `npm test -- src/state/gameStore.test.ts` and confirm the failure is caused by missing contradiction feedback.

## Step 2: Implement deterministic contradiction state

**File:** `src/state/gameStore.ts`

Add the transient feedback type and clear action. Populate it when prevention blocks a peer duplicate; clear it on selection and successful state-changing actions. Keep disabled-prevention behavior unchanged. Re-run the focused store test until green.

## Step 3: Specify the integrated UI behavior

**File:** `src/App.test.tsx`

Add tests for the bottom-right alert and transient contradiction rendering, DOM order of number pad before candidate pad, absence of candidate editor for a filled cell, completed-number semantics, and transfer controls appearing immediately after New Game. Run `npm test -- src/App.test.tsx` and confirm each new assertion fails for the intended missing behavior.

## Step 4: Implement component changes

**Files:** `src/App.tsx`, `src/components/SudokuBoard.tsx`, `src/components/GameControls.tsx`, `src/components/GameSidebar.tsx`, `src/game/errorToast.ts`

Watch contradiction state in `App`, show the existing alert, and clear it after the feedback lifetime. Render ghost/conflicting cells on the board. Reorder controls, hide the filled candidate panel, add completed-number state, and relocate transfer markup. Re-run focused UI tests until green.

## Step 5: Apply visual polish

**File:** `src/styles.css`

Halve New Game height, darken headings, style candidates as temporary notes, tune whitespace, remove dock backplates, bottom-align the dock with the board, tint completed digits green, and add a reduced-motion-safe sparkle transition.

## Step 6: End-to-end verification

Run `npm test`, `npm run typecheck`, and `npm run build`. Review the final diff against all nine requested changes and report any limitations.
