# Check Candidates Design

“Check Candidates” appears directly below the main number pad and is available while the game is playing. It validates every empty, editable cell: each must contain at least one candidate, and its stored solution digit must be among those notes. Filled and given cells are outside the check. Requiring coverage in every empty cell prevents a board with no notes from reporting a meaningless success; extra candidates are permitted because the feature checks that the solution remains possible, not that notes are fully reduced.

Candidate validation is a pure helper so React presentation and toast behavior do not own Sudoku logic. The button keeps a monotonically increasing attempt identifier with its latest result, allowing the same success or failure animation to replay on consecutive checks. Success applies a brief nod and sparkle treatment; failure applies a horizontal shake. Reduced-motion CSS suppresses both animations.

The existing bottom-right contradiction toast utility becomes a two-tone game-message utility. Error behavior remains backward compatible through `showErrorToast`; success uses a green border and background and an accessible status role. The control cleans up its active toast when replaced or unmounted, preventing stale messages between games and tests. Integration tests cover placement below the number pad, failure when any solution candidate is absent, success when every empty cell contains its solution, tone, and animation classes.

