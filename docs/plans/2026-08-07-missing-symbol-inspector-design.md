# Missing Symbol Inspector Design

## Interaction model

Missing-symbol information will be available on demand, preserving the board as the primary visual surface. A narrow numbered tab sits above every column and to the left of every row. Each box receives a small circular button at its top-left cell containing a grid icon (`▦`). The numbered tabs provide orientation without adding “R” and “C” text to every control; accessible labels and tooltips name the complete action. The box icon uses the established visual metaphor of a subdivided grid and is contained in a circle so it reads as a separate control rather than a candidate.

Clicking a trigger selects that unit, subtly highlights all of its cells, and opens one shared floating panel near the top center of the board. The panel names the scope (“Row 1 needs”, “Column 3 needs”, or “Box 2 needs”) and displays missing symbols as compact chips using the normal symbol mapping, including A–G for Hexadoku. A completed unit displays a green check and “All symbols placed.” Clicking the active trigger again or the panel close button dismisses it. Only one unit can be active, preventing stacked popovers and keeping touch interaction predictable.

## Architecture and validation

Missing digits are derived from current cell values with a pure helper and are never persisted. Duplicate values count as present once; every domain symbol not present is reported, which accurately answers “what is missing” even when the unit currently contains a contradiction. `SudokuBoard` owns the transient active-unit state and recomputes the panel after every move, so the list updates immediately. Semantic button groups, `aria-pressed`, a labelled dialog, and a real close button cover keyboard and assistive use. The existing paused/won overlay remains above the inspector. Tests cover all three trigger types, correct 4×4 missing sets, switching the single shared panel, completed-unit messaging, and dynamic updates after a value is entered.

