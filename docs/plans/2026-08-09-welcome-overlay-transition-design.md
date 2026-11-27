# Welcome Overlay Transition Design

The game board will mount immediately on page load, including restored progress when an active save exists. For the first one second, the player sees the unobscured board. React then mounts the welcome interface as a fixed, semi-transparent overlay and CSS fades it in over roughly 300 milliseconds. Mounting the dialog only after the delay keeps an invisible dialog out of the accessibility tree during the board preview.

The welcome state continues to lock the game from the first frame. Global keyboard routing already checks this state; the game layout will also become inert while a welcome decision is pending, preventing pointer, focus, and assistive-technology interaction during both the preview and overlay. The board remains visually rendered beneath the overlay. Resume removes the overlay and unlocks the restored state without mutation. New Game retains the overlay while changing to board-size and difficulty choices, and starting a puzzle replaces the state and unlocks the new board.

The current standalone welcome-shell presentation will become a fixed welcome-overlay inside the normal app shell. Its backdrop will use a translucent dark wash and light blur, while the card will remain warm and readable with slightly increased transparency. Reduced-motion preferences will disable the fade while preserving the requested one-second board preview.

Tests will use fake timers to prove the board is visible immediately, the dialog is absent through 999 milliseconds, the correct dialog appears at one second, and the same board remains mounted behind it. Existing resume and new-game interaction tests will advance the timer before operating the overlay. Input assertions will confirm the locked preview cannot change game state.
