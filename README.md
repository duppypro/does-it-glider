# does-it-glider

Paste a seed for Conway's Life from the clipboard and see if it creates a glider.

Inspired by good friend @peteyboy, creator of the first Wordle->Life
&nbsp;&nbsp;&nbsp;&nbsp;[Wordle Life Mojo](https://warofwordcraft.com/cgi-bin/wordle-life-mojo.cgi)

## Open Source with attribution required
### Copy liberally but please acknowledge where you got it.
That's why I don't minify or uglify the source code. The code uses vanilla ES Modules and D3.js with no build steps or bundlers. This is intentionally a static web app so curious users can easily read, learn from, and adapt the full code directly from the production site. 

## Overview & Flow
The application is a "mobile-first" interactive toy designed to fit gracefully on the smallest smartphone screens while remaining fully functional on a desktop. The grid is a fixed size, tuned specifically to accommodate the largest patterns that emerge from real Wordle seeds.

- **Attract Mode:** Upon loading the page, the game automatically parses a built-in seed and begins simulating Conway's Game of Life. This provides immediate visual feedback and demonstrates the functionality without requiring user interaction.
- **Paste Interface:** Users can tap the screen to paste text from their clipboard. The system presumes a Wordle-style syntax (colored emoji squares) and parses this text into a 2D grid seed for the simulation.
- **Interactive Canvas:** Users can click/touch and drag to **pan** around the grid, and pinch/scroll to **zoom** in and out of the cellular automaton.
- **The Event Loop (User View):** Once a seed is loaded, the game enters a continuous loop:
  1. Calculate the next generation (apply Game of Life rules).
  2. Render the live cells using D3.js.
  3. Update visual statistics (generation count, longest lived, etc.).

## Code Structure
To maintain clean architecture, the logic is decoupled into distinct modules:
- `main.js`: Handles the D3.js DOM rendering, user interactions (pasting, pan/zoom), and the core `requestAnimationFrame` event loop.
- `game-state.js`: A pure logic module that maintains the 2D grid state and applies Conway's Game of Life rules. It has no knowledge of the DOM.
- `local-stats.js`: Manages the user's historical statistics (longest lived seed, mature gliders, etc.) using browser Local Storage.
- `performance-monitor.js`: Tracks the frame rate and simulation speed.

*(Behind the scenes, the event loop also features diagnostic hooks (`dig_debug`) and performance baselining tools used for development and testing without interfering with the pure user experience.)*

## Future Directions
While the core experience is functional, there are several broad concepts planned for future exploration (these require further planning before specific GitHub issues are created):

- **OAuth Integration & Global Leaderboards:** Allow users to sign in (starting with Google OAuth) to save their stats across devices. This will enable global leaderboards and potentially introduce premium, monetized features.
- **Advanced Pattern Detection:** Beyond detecting gliders, the engine could be expanded to detect other famous Life patterns such as Spinners, Oscillators, and Tombstones.
