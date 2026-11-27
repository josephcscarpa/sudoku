# Plan: Missing Symbol Inspector

**Goal**: Add low-clutter row, column, and box controls that reveal the currently missing Sudoku symbols.
**Architecture**: Keep unit math pure, active inspection local to `SudokuBoard`, and present one shared accessible panel.
**Tech Stack**: React 19, TypeScript, Vitest, Testing Library, CSS.

## Step 1: Add failing interaction tests

**File**: `src/App.test.tsx`

- Assert one row and column control per grid line and one box marker per box.
- Click Row 1 and verify missing symbols 1 and 2.
- Switch to Column 1 and verify only symbol 1.
- Open Box 1 and verify symbols 1 and 2.
- Verify a complete row reports “All symbols placed.”
- Run the targeted tests and confirm failure because controls are absent.

## Step 2: Implement missing-symbol calculation

**File**: `src/game/missingSymbols.ts`

- Define row/column/box inspection types.
- Collect present digits for the requested unit.
- Return ordered missing digits from 1 through grid size.

## Step 3: Implement inspector UI

**File**: `src/components/SudokuBoard.tsx`

- Add top column tabs and left row tabs with pressed state.
- Add circular box-origin controls.
- Render one labelled, closable panel with symbol chips or completion copy.
- Apply an active-unit class to member cells and update results from live values.

## Step 4: Style and responsive behavior

**File**: `src/styles.css`

- Style outside-edge tabs, compact box circles, active states, unit highlighting, and shared panel.
- Scale controls down naturally for 16×16 and mobile boards.
- Keep pause/completion overlays above the inspector.

## Step 5: End-to-end verification

- Run the full Vitest suite.
- Run the TypeScript project check.
- Run the production build.

| Group | Steps | Dependencies | Can Parallelize |
|---|---|---|---|
| 1 | 1 | None | No |
| 2 | 2–3 | Step 1 | No; UI consumes helper |
| 3 | 4 | Step 3 | No |
| 4 | 5 | All prior steps | No |
