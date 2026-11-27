# Sudoku UI Polish Design

**Date:** 2026-08-07
**Status:** Validated

## Interaction and layout

The right rail will lead with the fill-in keypad because entering a value is the primary action. The candidate editor follows it and appears only while the selected cell is empty. Its lighter, dashed, paper-like treatment will distinguish tentative notes from committed values; selecting a filled cell removes the panel rather than replacing it with another oversized value card. Number buttons retain their current disabled behavior when all copies are placed, but gain a calm green tint. The transition into that completed state gets a brief sparkle burst, disabled under `prefers-reduced-motion`.

The left rail will become more compact. New Game is reduced to roughly half its current visual height, and Import / Export moves directly below it. Tools and move history follow. The shortcut dock loses its card and per-icon backplates, and remains aligned no lower than the board edge. Section headings use a darker neutral for clearer hierarchy. Existing responsive stacking remains intact, with tighter gaps and no new fixed dimensions that would create overflow.

## Contradiction feedback

Conflict prevention remains enabled by default and continues to reject illegal placements without adding them to history or increasing mistakes. A rejected attempt creates transient presentation state containing the attempted cell, matching peer cells, digit, and a human-readable explanation. The board immediately highlights both sides of the contradiction and renders the attempted digit as a temporary red ghost in the selected cell. A bottom-right alert says, for example, “1 already appears in row 1 at R1C2.” Row, column, and box are evaluated in that order for stable copy. A new attempt replaces the old one, and successful edits, selection changes, undo/reset, or a short timeout clear the feedback. The React shell owns toast timing and cleanup while the Zustand store owns the deterministic contradiction description, keeping DOM effects out of game logic.

## Testing

Store tests will prove that blocked conflicts expose precise feedback without mutating the puzzle, while allowed conflicts still work when prevention is disabled. UI tests will verify the toast, highlighted/ghost cells, fill-before-candidate order, candidate disappearance for filled cells, completed-number state, and relocated transfer controls. Styling details and motion are expressed through semantic classes so the behavioral tests avoid brittle computed-style assertions.
