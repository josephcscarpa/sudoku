# Completion Reveal Design

**Date:** 2026-08-07
**Status:** Validated from requested behavior

When the final correct digit is entered, the existing board overlay will display “Puzzle Completed!” long enough to register, then fade and scale away to reveal the complete solved board. The overlay is presentation-only: the game remains in its existing `won` state, so input stays disabled and persistence semantics do not change. React will dismiss only the completion overlay in response to its CSS `animationend`; paused and lost overlays keep their current persistent behavior. Reduced-motion users receive a near-instant reveal without pulsing or spatial movement.

At the same completion transition, the sidebar New Game button receives a celebration class. Its pulse begins as the board overlay finishes fading, runs three times, and stops rather than looping indefinitely. Starting or importing a playable game removes the class naturally because it is derived from game status. An integration test will solve the two remaining cells of the 4×4 fixture, verify the completion announcement and pulse state, fire the overlay animation event, and confirm the full solved board remains visible after the overlay is removed.
