# Plan: Welcome Screen on Page Load

**Goal**: Gate the Sudoku board behind a startup screen that resumes active saved games or starts a new game when no active save exists.
**Architecture**: Add a pure persisted-status query, expose production startup state from the default store bootstrap, and render a startup state machine in `App` while reusing the existing game generator and selectors.
**Tech Stack**: React 19, TypeScript, Zustand, localStorage, Vitest, Testing Library, CSS.

## Step 1: Classify persisted games

**File**: `src/persist/gamePersistence.test.ts`, `src/persist/gamePersistence.ts`

1. Add failing tests proving only valid `playing` and `paused` saves count as active, while missing, `won`, and `lost` saves do not.
2. Run `npm test -- src/persist/gamePersistence.test.ts` and confirm failure because `hasActiveSavedGame` does not exist.
3. Implement `hasActiveSavedGame(storage)` by reading and decoding the native payload and checking its status.
4. Re-run the targeted test and confirm it passes.

## Step 2: Add startup welcome behavior

**File**: `src/App.test.tsx`, `src/App.tsx`, `src/game/defaultGame.ts`

1. Add failing interaction tests for the active-save choice screen, Resume preserving store state, New Game revealing selectors, direct New Game flow without an active save, and keyboard isolation.
2. Run `npm test -- src/App.test.tsx` and confirm the welcome queries fail.
3. Export the default bootstrap's active-save result, add an injectable `initialWelcome` prop, and implement `resume`, `choice`, and `new-game` startup transitions in `App`.
4. Reuse the existing selection controls and `startGame`; do not mount the game layout while startup UI is active.
5. Re-run the targeted test and confirm all App interactions pass.

## Step 3: Style the welcome layer

**File**: `src/styles.css`

1. Add responsive full-viewport welcome layout, brand treatment, choice actions, and selector-card styles using the current visual tokens.
2. Keep focus outlines and native labelled controls intact.
3. Run `npm run build` to validate CSS bundling.

## Step 4: End-to-end verification

1. Run `npm test`.
2. Run `npm run typecheck`.
3. Run `npm run build`.
4. Review the final diff for active/paused versus won/lost behavior, accessible names, and absence of unrelated changes.

| Group | Steps | Dependencies | Can Parallelize |
|---|---|---|---|
| 1 | Step 1 | None | No; strict red/green cycle |
| 2 | Step 2 | Step 1 | No; consumes persistence result |
| 3 | Step 3 | Step 2 | No; styles final markup |
| 4 | Step 4 | All prior steps | No |
