# Follow-up UX Adjustments Design

The fill-in issue is treated as focus continuity rather than game-state continuity: the store already keeps the cell selected and accepts a different digit, but clicking the on-screen number pad leaves browser focus on that control. The minimal fix is to release number-pad focus after its click action, keeping subsequent keystrokes routed through the existing window keyboard handler. Alternatives—forcing focus back to the cell or adding a second keyboard controller—would either steal focus after unrelated edits or duplicate existing routing.

Candidate typography will be scoped by surface. Main-board `.candidate` elements return to the application’s normal UI font, optimizing legibility at small sizes. Only `.enlarged-candidate` retains the handwritten stack, preserving the bespoke note-taking feel where it has enough visual space.

The completion overlay remains animation-driven and presentation-only. Its full-screen hold increases from 450 milliseconds to 2.5 seconds before the existing 1.15-second fade, for roughly 3.65 seconds of total display. Reduced-motion behavior remains near-instant. Regression tests cover number-pad focus release followed by keyboard replacement, computed font families for both candidate surfaces, and the completion animation delay.
