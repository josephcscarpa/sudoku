# Plan: Delayed Semi-Transparent Welcome Overlay

**Goal**: Show the Sudoku board for one second on page load, then fade the welcome flow over it as a semi-transparent, non-interactive game overlay.
**Architecture**: Keep the game layout mounted, add a one-shot React reveal timer for the welcome dialog, lock the layout with inert state while welcome is pending, and use CSS for the overlay fade.
**Tech Stack**: React 19, TypeScript, Vitest fake timers, Testing Library, CSS.

## Step 1: Specify delayed overlay behavior

**File**: `src/App.test.tsx`

1. Replace the old “board absent” welcome assertions with a test that renders an initial welcome state and asserts the board exists immediately while the dialog does not.
2. Advance fake timers to 999 ms and assert the dialog is still absent; advance to 1000 ms and assert the dialog appears while the same board remains visible.
3. Assert a keyboard entry during the preview does not mutate the selected cell.
4. Run `npm test -- src/App.test.tsx` and confirm failure because the current component returns the welcome screen immediately without mounting the board.

## Step 2: Implement the reveal timer and mounted board

**File**: `src/App.tsx`

1. Add `welcomeRevealed` state initialized from whether a welcome decision exists.
2. Add an effect that sets `welcomeRevealed` after 1000 ms and cleans up the timeout on unmount or dismissal.
3. Remove the early welcome return, render the normal game layout at all times, and conditionally render the welcome overlay after the timer.
4. Mark the game layout inert while `welcome` is non-null, retaining the existing keyboard guard.
5. Run `npm test -- src/App.test.tsx` and confirm the delayed overlay and existing interactions pass.

## Step 3: Restyle welcome as an overlay

**File**: `src/styles.css`

1. Replace full-page standalone welcome-shell styles with a fixed translucent backdrop over the app shell.
2. Add 300 ms backdrop/card entrance animations and preserve board visibility beneath the wash and light blur.
3. Disable these animations under `prefers-reduced-motion` while retaining the React delay.
4. Run `npm run build` and confirm CSS compiles into the production bundle.

## Step 4: End-to-end verification

1. Run `npm test`.
2. Run `npm run typecheck`.
3. Run `npm run build`.
4. Review behavior against the one-second delay, semi-transparent overlay, locked preview, active-save choices, and new-game-only flow.

| Group | Steps | Dependencies | Can Parallelize |
|---|---|---|---|
| 1 | Step 1 | None | No; establishes the red test |
| 2 | Step 2 | Step 1 | No; implements the tested behavior |
| 3 | Step 3 | Step 2 | No; styles the final markup |
| 4 | Step 4 | All prior steps | No |
