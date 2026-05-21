# Architecture: Does It Glider?

## Data Flow
`User Action (Paste)` -> `Parser` -> `GameState` -> `EventEmitter` -> `D3 Renderer`

## 1. State Management (`GameState`)
The state should be encapsulated in a class that manages the Life grid and the "ping-pong" buffers.
- **Buffers:** `grid_ping` and `grid_pong`.
- **Logic:** `tick()` evolves the grid by applying `conway/rules.js`.
- **Sparse Representation:** Internally, consider tracking *only* live coordinates to optimize for the "Sparse DOM" strategy.

## 2. The Logic/View Boundary
- The **Logic** (`GameState`) should not know about D3, the DOM, or colors.
- The **View** (`Renderer`) should observe the `GameState` and update only what changed.

## 3. Sparse Rendering Strategy
To keep the DOM light:
- Use D3's `.data(live_cells, d => d.id)` pattern.
- **Enter:** Append `rect` or `div` for new live cells.
- **Update:** Move or transition existing live cells.
- **Exit:** Remove cells that died.

## 5. Grid Boundary Behavior
- **Non-Toroidal:** The grid does not wrap around.
- **Dead Boundary:** Coordinates outside the `GRID_WIDTH` or `GRID_HEIGHT` are strictly treated as dead cells (`'⬛'`).
- **Stabilization:** Moving patterns like gliders will stabilize into static patterns (typically a 2x2 block) when they hit the boundary.
