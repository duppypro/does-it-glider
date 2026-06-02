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

## 6. Benchmarking Protocol
To ensure performance consistency, use the following patterns and generation counts as baselines:

### Baseline 1: Wordle 1,751 (Stability Test)
- **Target:** 250 Generations
- **Pattern:**
  ```
  ⬛⬛⬛⬛⬛
  ⬛🟨⬛🟨⬛
  ⬛🟩🟨⬛⬛
  🟩🟩⬛🟩⬛
  🟩🟩⬛🟩🟩
  🟩🟩🟩🟩🟩
  ```
- **Behavior:** Stabilizes into a 2-gen oscillating pattern after ~220 generations.

### Baseline 2: Wordle 1,750 (Longevity Test)
- **Target:** 1250 Generations
- **Pattern:**
  ```
  🟨⬛⬛🟨⬛
  🟩⬛🟨⬛⬛
  🟩🟩🟩🟩🟩
  ```
- **Behavior:** Requires a longer observation period to verify performance under sustained load.

## 7. Performance Gold Standard (May 22, 2026)
Measured on the `next-feature-glider-detection` branch with Stability Detection active, dynamic D3 color interpolation, and synchronous benchmarking:

### Baseline 1: Wordle 1,751 (250 Gen Target)
- **Measured Gen Count:** 250
- **Avg. Time/Gen:** ~1.16 ms
- **DOM Created (Total):** 8,145
- **Gliders Detected:** 0

### Baseline 2: Wordle 1,750 (1250 Gen Target)
- **Measured Gen Count:** 1,250
- **Avg. Time/Gen:** ~1.86 ms
- **DOM Created (Total):** 59,348
- **Gliders Detected:** 19

## 8. Deployment & VPS Security Architecture
To guarantee absolute deployment security while utilizing both ephemeral cloud environments and stateful remote workspaces, the project enforces a strict separation of privileges.

### Ephemeral Cloud Agents (Oz)
- **Role:** Production Deployments, CI/CD, Automated Testing.
- **Security:** Injects full-privilege Warp-managed secrets (e.g. `FIREBASE_TOKEN`) dynamically into single-use, serverless containers. These credentials are wiped immediately upon completion of the deployment.

### Stateful Remote Workspace (Hostinger VPS)
- **Role:** Interactive sandboxing, persistent agent development (`pi`/`claude`).
- **Security (Least Privilege):** Restricted to read-only access.
- **Configuration:**
  - **IAM Roles:** `Logging Viewer` (`roles/logging.viewer`) and `Firebase Hosting Viewer` (`roles/firebasehosting.viewer`).
  - **Credentials File:** `~/.pi/agent/firebase-read-only.json` (GCP Service Account JSON key).
  - **Environment Variable:** `GOOGLE_APPLICATION_CREDENTIALS="/home/princess-pi/.pi/agent/firebase-read-only.json"` (configured in `~/.bashrc`).
  - **Capability:** Allows the local agent to fetch operational logs and view releases, but strictly blocks any write or deployment capability (`firebase deploy` will result in a 403 Forbidden).
