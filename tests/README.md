# Headless & Integration Tests

This directory contains the headless test suite for **Does it Glider?** to verify state machine logic and cellular automata rules outside of a browser environment.

## Logic Test (`logic-test.js`)

Verifies:
- `GameState` initialization and properties.
- Dynamic seed loading and grid resets.
- Simulation step ticking and coordinate transformations.
- Speed multiplier scaling and reset-on-load behaviors.

### Running Headless Tests

Because this project adheres to browser-native ES Modules and loads D3 directly from a CDN (e.g., `https://cdn.jsdelivr.net/...`), Node's default ESM loader will raise an `ERR_UNSUPPORTED_ESM_URL_SCHEME` error when trying to run tests directly.

To solve this securely and instantly without installing massive npm dependencies, we use a lightweight custom mock loader (`mock-loader.js`) to stub browser-only modules.

Run the tests with:
```bash
node --experimental-loader ./tests/mock-loader.js tests/logic-test.js
```

---

## Browser Baseline Performance Tests

To verify DOM rendering throughput and glider detection repeatability under load, the project includes an official assertion-based performance benchmark suite.

### Running Performance Baselines

1. Open the application in a web browser.
2. Open the browser's developer console (F12 or Cmd+Option+I).
3. Execute the following command:
   ```javascript
   await window.dig_debug.run_official_baselines()
   ```
4. The console will display a real-time log of the benchmark runner executing **Baseline 1751** and **Baseline 1750**, asserting exact generation counts, glider detections, and stable cycle lengths.
