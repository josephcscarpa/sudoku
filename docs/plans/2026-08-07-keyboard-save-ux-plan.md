# Plan: Keyboard and Save UX Improvements

**Goal**: Add mouse-free editing shortcuts, clearer save/restore controls, timestamped saves, current difficulty, and requested visual polish.
**Architecture**: Extend the existing App keyboard router and sidebar/component presentation while reusing Zustand actions and the compatible JSON decoder.
**Tech Stack**: React 19, TypeScript, Zustand, Vitest, Testing Library, CSS.

## Step 1: Keyboard interaction tests

**File**: `src/App.test.tsx`

- Test Ctrl/Cmd+Z undo and Ctrl/Cmd+Shift+Z redo through real keydown events.
- Test Shift+digit candidate add/remove and Shift+A–G decoding on a 16×16-compatible store.
- Test that an ordinary second symbol replaces the selected editable value.
- Run `npm test -- src/App.test.tsx` and confirm the new assertions fail for missing behavior.

## Step 2: Keyboard routing implementation

**Files**: `src/App.tsx`, `src/components/GameControls.tsx`

- Give undo/redo modifier shortcuts priority over symbol decoding.
- Decode shifted digit codes and letter symbols, then call `toggleCandidate` on the selected cell.
- Preserve ordinary replacement entry and update the visible shortcut note.
- Run `npm test -- src/App.test.tsx` and confirm the keyboard cases pass.

## Step 3: Save metadata and filename tests

**Files**: `src/game/gameTransfer.test.ts`, `src/App.test.tsx`

- Assert saved JSON contains a supplied ISO export timestamp and still decodes.
- Assert filename formatting contains local date and time safely.
- Assert current difficulty and Save Game / Restore Game labels render.
- Run the targeted test files and confirm failures precede implementation.

## Step 4: Save and sidebar implementation

**Files**: `src/game/gameTransfer.ts`, `src/components/GameSidebar.tsx`

- Add optional timestamp injection to export encoding.
- Add a pure timestamped filename builder and use one shared save time for content and filename.
- Rename controls and render difficulty directly below New Game.
- Run targeted tests and confirm they pass.

## Step 5: Visual polish

**Files**: `src/styles.css`, `src/App.test.tsx`

- Bold remaining counts, apply a handwritten candidate font stack, and enlarge settings.
- Assert semantic classes/control structure where useful; verify computed/static CSS via build and visual DOM structure rather than brittle pixel tests.

## Step 6: End-to-end verification

- Run `npm test`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Review the diff against all nine requested behaviors.

| Group | Steps | Dependencies | Can Parallelize |
|---|---|---|---|
| 1 | 1–2 | None | No; strict red/green cycle |
| 2 | 3–4 | Step 2 | No; strict red/green cycle |
| 3 | 5 | Step 4 | No |
| 4 | 6 | All prior steps | No |
