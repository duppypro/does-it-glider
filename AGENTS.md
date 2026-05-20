# Agent Instructions (The Duppy Standard)

## Core Philosophy
- **Vanilla & Simple:** No build steps (Vite, Webpack, etc.). Use browser-native ES Modules.
- **CDN over NPM:** Prefer `https://cdn.jsdelivr.net/...` for external libraries like D3.
- **Sparse DOM:** Only create DOM elements for *live* cells. Manageable performance is expected due to the sparse nature of Life patterns.
- **Decoupling:** Logic (Rules/State) must be strictly separated from Visualization (D3/Rendering).

## Naming Conventions
- **snake_case EVERYTHING:** Use `snake_case` for variables, function names, filenames, and project assets. 
  - *Reason:* Cross-language consistency (Python/URL/FS) and avoidance of hyphen/minus confusion.
- **PascalCase for Classes:** Only use `PascalCase` for Class names (e.g., `GameState`).

## JavaScript Style
- **Functions:** 
  - Use `function` declarations for top-level module functions.
  - Use `const name = () => {}` (arrow functions) for callbacks and inside D3 transitions to maintain lexical scope.
- **State:** Avoid top-level variables for app state. Use the `GameState` class.

## Error Handling
- **Explicit but Quiet:** No `alert()` or blocking modals.
- **Self-Timing UI:** Use a dedicated notification area in the UI that fades out/times out for errors.

## Documentation
- Maintain the `// ---` visual separators in files.
- Document "Why" more than "What".
