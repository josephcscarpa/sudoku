# Sudoku Clone — Design & Implementation Plan

**Date:** 2026-08-06
**Status:** Draft, pending baseline verification against sudoku.game (blocked on internet access)

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Stack | React + TypeScript + Vite | Fast dev loop, clean Web Worker story, good fit for a memoized 256-cell grid |
| Max board size | 16×16 (box b ∈ {2,3,4}) | 25×25 generation cost is disproportionate; engine stays generic so b=5 can be added later |
| Persistence | localStorage only | No backend. History tree, stats and settings serialize per browser |
| State | Zustand | Single store: board + history tree + guess scopes |
| Testing | Vitest against the pure engine | Engine has zero UI deps and is fully unit-testable |

## Baseline feature set (to clone)

> ⚠️ Compiled from general knowledge of sudoku.game and its peers, **not** verified against the live
> site. Re-verify once internet access is available.

**Core play**
- Fixed grid with locked given clues; difficulty tiers (Easy / Medium / Hard / Expert)
- Number pad with per-digit "remaining count" badge
- Keyboard input: arrows to move, digit keys to fill, Backspace/Delete to clear
- Notes (pencil-mark) mode toggle, rendered as a mini-grid of candidates per cell
- Undo, Erase, Hint (reveal one cell), Auto-check

**Feedback & assists**
- Highlight selected cell, its row/column/box, and all cells sharing the selected digit
- Conflict highlighting on duplicates within a unit
- Mistake counter (3 strikes → game over)
- Auto-remove notes from peer cells when a digit is placed

**Session & meta**
- Timer with pause overlay (board obscured while paused)
- New Game / Restart / resume-from-storage
- Daily challenge with completion calendar
- Stats: best & average time per difficulty, win rate, streaks
- Settings: dark mode, show/hide timer, highlight toggles, auto-check
- Static how-to-play and technique content

**Not cloned:** visual design, layout, copy, and assets. Mechanics are reimplemented from scratch;
the look is our own.

---

## Terminology

Two distinct concepts, deliberately not sharing a name:

- **Candidates** (a.k.a. pencil marks / notes) — the small digits inside a single cell recording
  which values are still possible there. Feature 1a below.
- **Guess** / **checkpoint** — a flagged point in move history that can be reverted to when a
  contradiction appears. Feature 2 below.

---

## New feature 1a — Fixed-position candidate grid

Each cell contains a `b × b` sub-grid holding all `b²` possible values in **fixed positions**.
Candidate `d` always renders at sub-row `⌊(d-1)/b⌋`, sub-column `(d-1) mod b`:

```
┌───┬───┬───┐        ┌───┬───┬───┐
│ 1 │ 2 │ 3 │        │ 1 │   │ 3 │
├───┼───┼───┤        ├───┼───┼───┤
│ 4 │ 5 │ 6 │   →    │   │   │ 6 │
├───┼───┼───┤        ├───┼───┼───┤
│ 7 │ 8 │ 9 │        │ 7 │   │   │
└───┴───┴───┘        └───┴───┴───┘
   b = 3 layout       candidates {1,3,6,7}
```

**Absent candidates leave their slot empty rather than collapsing.** This is the whole point: a
digit lives at the same spot in every cell on the board, so the eye can scan a row for "where can 5
go" without reading anything. Compacting the visible marks together would destroy that.

Scales without special-casing — the sub-grid is `b × b` because it holds `b²` candidates:

| b | Grid | Candidate sub-grid |
|---|---|---|
| 2 | 4×4 | 2×2 |
| 3 | 9×9 | 3×3 |
| 4 | 16×16 | 4×4 |

Implementation is a nested CSS Grid with `grid-area` derived from the digit, so slot positions are
structural rather than computed at render time.

**Interactions**
- Clicking a candidate slot directly toggles that digit — no need to enter notes mode first
- Auto-clean removes a candidate from peer cells when a digit is placed (bundled into the same
  `Move`, so one undo reverses it all)
- Optional setting: auto-fill all legal candidates for empty cells. An assist, so it is off by
  default and disabled on higher difficulties
- Highlighting the selected digit also highlights its candidate slot across the board

---

## New feature 1b — Move log, time travel, guess checkpoints

### History is a tree, presented as a line

Classic undo truncates the future when you rewind and act. That is exactly wrong for the guess
workflow: rewinding to a guess to try the other candidate would discard the evidence just gathered.

Every move is a node with a parent. Making a move after rewinding creates a **branch** and
auto-focuses it. The log renders only the current root→cursor path, with a "2 branches" affordance
at fork points. Simple mental model, no data loss, and nested guesses come free.

### Move representation — invertible deltas

```ts
type CellPatch = {
  r: number; c: number;
  before: { value: Digit | null; notes: ReadonlySet<Digit> };
  after:  { value: Digit | null; notes: ReadonlySet<Digit> };
};

type Move = {
  id: MoveId;
  parentId: MoveId | null;
  kind: 'set' | 'erase' | 'note-add' | 'note-remove' | 'auto-clean';
  patches: CellPatch[];   // >1 when a placement auto-cleans peer notes
  guessId: GuessId | null;
  at: number;
};
```

Navigating to any node = walk up to the common ancestor unapplying patches, then down applying
them. O(path distance), which is negligible. Snapshots were rejected: at 16×16 that is 256 cells ×
16 candidates per move.

`auto-clean` patches are bundled into the triggering `set` move so one undo reverses the whole
logical action.

### Guesses are scopes, not single moves

"Start guess" opens a scope at the current node. Every subsequent move inherits it until the user
commits or reverts. Consequences:

- Cells written inside an open guess render in a distinct tentative colour
- The log shows the scope as an indented, tinted band
- Nesting works naturally, since the scope stack mirrors the tree path

### Contradiction detection

Ascending cost, each independently toggleable:

| Level | Check | Cost |
|---|---|---|
| L0 | Duplicate digit in a row/column/box | Free, always on |
| L1 | An empty cell with zero legal candidates | Cheap |
| L2 | A digit with no legal home in some unit | Cheap |
| L3 | Full solver proves the position dead | Expensive — worker, debounced, opt-in |

L3 is effectively a hint, so it is off by default and disabled on higher difficulties.

When a check fires inside an open guess:

> **Contradiction.** Your guess at #12 (R6C1 = 9) was wrong.
> `[Revert to guess]` `[Keep exploring]`

**Revert offers to auto-eliminate the refuted candidate** from that cell's notes. This converts a
failed guess into permanent knowledge, which is what a human solver actually does — and is the
feature that makes this version better rather than merely different.

### Log panel

```
#14  R4C7 = 5                     ← cursor
#13  R2C3  notes +2 +7
 ├ #12  R6C1 = 9   ⚑ GUESS
 │ #11  R1C1 = 3
```

Clicking any row moves the cursor to that state. Fork points show a branch switcher.

---

## New feature 3 — Import / export game state as a text file

Two tiers, because they serve different purposes.

### Native format — `.sudoku.json`, lossless

Everything needed to resume a session exactly, including the parts no other app models:

```jsonc
{
  "format": "sudoku-clone/v1",
  "boxSize": 3,
  "givens":  "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79",
  "cells":   [ { "r": 0, "c": 2, "value": 4, "candidates": [1, 4, 9] } ],
  "history": { "nodes": [ /* Move[] with parentId */ ], "cursor": "m14" },
  "guesses": [ { "id": "g1", "atMove": "m12", "status": "open" } ],
  "elapsedMs": 743000,
  "mistakes": 1,
  "difficulty": "hard",
  "createdAt": "2026-08-06T00:00:00.000Z"
}
```

The history tree is a flat node list with parent pointers, so it serializes with no graph-walking.
Same shape used for localStorage, so persistence and export share one codec and one set of tests.

### Interop format — plain text, lossy

A bare grid: `b²` lines of `b²` characters, `.` or `0` for empty. Also accepts the common
single-line 81-character form for 9×9. This is the lingua franca of sudoku tooling, so it is worth
reading and writing even though it carries no candidates, history, or timer.

**Import behaviour**
- Sniff the format — leading `{` means native, otherwise treat as plain text
- Infer `b` from grid dimensions; reject anything that is not a perfect square of a perfect square
- Validate before loading: legal characters, no duplicate in any unit among the givens, and a
  solver check for at least one solution. Warn (do not block) if the puzzle has multiple solutions
- Load into a fresh game; never silently overwrite an in-progress board
- Reject with a specific message rather than a generic parse failure — say which line and why

**Export behaviour**
- Download via `Blob` + object URL, no backend needed
- Copy-to-clipboard alongside download, since the plain form is small enough to paste
- Filename `sudoku-{b}x{b}-{difficulty}-{date}.sudoku.json`

Round-trip property tests: native export → import → export must be byte-identical, and a random
history tree must survive the round trip with its cursor and branch structure intact.

---

## New feature 2 — Variable board size

Box dimension `b` → grid `b² × b²`:

| b | Grid | Symbols | Note mini-grid |
|---|---|---|---|
| 2 | 4×4 | 1–4 | 2×2 |
| 3 | 9×9 | 1–9 | 3×3 |
| 4 | 16×16 | 1–9, A–G | 4×4 |

The note mini-grid is always `b × b` — it holds `b²` candidates. Falls out cleanly, no special
casing.

**Symbols.** `A–G` for 10–16 keeps every digit a single keystroke, which sidesteps multi-character
input entirely. The UI layer never touches raw numbers; everything goes through a symbol-set
abstraction.

**Generation.** Carving a uniquely-solvable puzzle requires re-solving after each clue removal.
Naive backtracking is too slow at 16×16, so the solver is Algorithm X / dancing links with
constraint propagation, running in a Web Worker with a progress indicator.

**Render.** CSS Grid, memoized cells, no full-board re-render per keystroke. 256 cells is
comfortable; the memoization discipline matters mainly as insurance for a future b=5.

---

## Architecture

The two features share one requirement: a **size-generic pure-TypeScript engine with no hardcoded
9s**, exposing the cell-patch primitive that the history layer records.

```
packages/engine/            # zero UI deps, unit-tested in isolation
  grid.ts                   # Grid<b>, unit/peer derivation, symbol sets
  solver.ts                 # DLX + constraint propagation
  generator.ts              # clue carving with uniqueness check
  validate.ts               # contradiction detection L0–L3
  techniques.ts             # graded hints
src/
  state/                    # store: board, historyTree, guessScopes, settings
  workers/solver.worker.ts
  components/               # Board, Cell, CandidateGrid, NumPad, MoveLog,
                            # GuessBanner, Toolbar, ImportExportDialog
  codec/                    # one serializer, three consumers:
    native.ts               #   localStorage, file export, file import
    plaintext.ts            #   interop grid format
    sniff.ts                #   format detection + validation errors
```

`codec/` is deliberately separate from `persist/`: localStorage and file export are the same
problem, so they share one implementation and one test suite rather than drifting apart.

The engine is generic from day one even though the UI only exposes 9×9 until Phase 4. Retrofitting
size-genericity later would mean rewriting all of it.

## Phases

| Phase | Deliverable |
|---|---|
| **0** | Scaffold + engine core, TDD. Grid, DLX solver, generator, validator, symbol sets. Size-generic. No UI. |
| **1** | Playable 9×9: board, fixed-position candidate grid, input, highlighting, timer, mistakes, new game/restart. |
| **2** | `codec/` — native + plaintext serializers, validation, round-trip tests. Wired to localStorage resume. |
| **3** | History tree + move log panel + click-to-navigate to any prior state. History joins the native codec. |
| **4** | Guess scopes, tentative rendering, contradiction detection L0–L2, revert-to-guess, candidate elimination on refute. |
| **5** | Size selector b ∈ {2,3,4}: worker generation, symbol sets, responsive board sizing. |
| **6** | Import/export UI: file picker, drag-and-drop, download, copy-to-clipboard, error surfacing. |
| **7** | Polish: stats, settings, themes, daily puzzle, contradiction L3, technique-based hints. |

## Open questions

- Baseline feature list needs verification against the live site (blocked on internet access)
- Should the move log persist across sessions, or reset on resume? (Leaning: persist — it is the
  most interesting state in the app)
- Difficulty grading for non-9×9 sizes needs calibration; technique-based grading from `techniques.ts`
  is the likely approach
- Should an imported puzzle with multiple solutions be playable? (Leaning: yes, with a warning
  banner — rejecting it is unhelpfully strict for a hand-typed grid)
- Candidate slot click targets are small on mobile at b=4. May need a long-press or zoomed cell
  editor as a fallback
