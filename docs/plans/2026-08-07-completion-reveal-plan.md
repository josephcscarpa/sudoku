# Plan: Completion Reveal and New Game Pulse

**Goal**: Celebrate a solved puzzle briefly, then reveal the full completed board and draw attention to New Game.
**Architecture**: Keep `won` as domain state, dismiss only the visual completion overlay on CSS `animationend`, and derive the New Game pulse class from status.
**Tech Stack**: React, TypeScript, CSS animations, Vitest, Testing Library.

## Step 1: Add the failing completion interaction test

**File:** `src/App.test.tsx`

Solve the fixture, expect an accessible “Puzzle Completed!” overlay and celebrating New Game class, fire `animationend`, and expect the solved board with no overlay. Run the focused App test and verify the failure is due to missing reveal behavior.

## Step 2: Implement the reveal state and pulse hook

**Files:** `src/components/SudokuBoard.tsx`, `src/components/GameSidebar.tsx`, `src/App.tsx`

Track whether the won overlay animation has completed, dismiss it without changing `won`, and add the status-derived celebration class to New Game. Re-run the focused test until green.

## Step 3: Add motion and reduced-motion styles

**File:** `src/styles.css`

Add the completion overlay exit animation and delayed finite New Game pulse. Under reduced motion, make the reveal effectively immediate and disable the pulse.

## Step 4: End-to-end verification

Run the full tests, TypeScript build, and production bundle.
