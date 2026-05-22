//////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, 2025 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider
//      game-state
//////////////////////////////////////////////////////////////////////

import * as dig from './imports.js'

export class GameState {
    constructor(width, height, settings) {
        this.grid_width = width
        this.grid_height = height
        this.settings = settings

        // Initialize grids
        this.grid_ping = Array.from({ length: height }, () => Array.from({ length: width }, () => '⬛'))
        this.grid_pong = Array.from({ length: height }, () => Array.from({ length: width }, () => '⬛'))
        this.ping_pong = true // true when ping is current, false when pong is current

        this.gen_count = 0
        this.new_pause_countdown = settings.NEW_PAUSE_MSEC
        this.msec_per_gen = settings.MSEC_PER_GEN
        this.msec_to_next_gen = 0
        this.is_paused = false
        this.is_stable = false
        this.history = [] // Circular buffer of last 8 state hashes
        this.live_cells = []
        this.next_live_cells_to_clear = [] // Tracks live cells in the 'next' buffer for sparse clearing

        this.glider_id_counter = 1
        this.active_gliders = [] // [{id, x, y, phase, orientation_idx}]
        this.orientations = this._generate_orientations(dig.glider_templates)
    }

    toggle_pause() {
        this.is_paused = !this.is_paused
        return this.is_paused
    }

    get current_grid() {
        return this.ping_pong ? this.grid_ping : this.grid_pong
    }

    get next_grid() {
        return this.ping_pong ? this.grid_pong : this.grid_ping
    }

    tick(msec_per_tick, force = false) {
        if (this.is_stable && !force) return false
        if (this.is_paused && !force) return false

        let gen_advanced = false

        if (this.msec_to_next_gen <= 0 || force) {
            if (!force) this.msec_to_next_gen += this.msec_per_gen
            
            if ((this.new_pause_countdown <= 0 || force) && this.gen_count < 9999) {
                const next_live_cells = dig.apply_rules_old_new(
                    this.current_grid, 
                    this.next_grid, 
                    this.live_cells, 
                    this.next_live_cells_to_clear
                )
                
                if (next_live_cells) {
                    // Inject gen_count onto the cells so the renderer can sync animations
                    for (const cell of next_live_cells) {
                        cell.gen_count = this.gen_count + 1
                    }
                    this.next_live_cells_to_clear = this.live_cells
                    this.live_cells = next_live_cells
                }
                
                this.ping_pong = !this.ping_pong
                this.gen_count++
                gen_advanced = true
                this._detect_gliders()
                this._check_stability()
            }
        }

        if (this.new_pause_countdown > 0) {
            this.new_pause_countdown -= msec_per_tick
        } else {
            this.new_pause_countdown = 0
        }
        
        this.msec_to_next_gen -= msec_per_tick

        return gen_advanced
    }

    load_new_seed(new_seed) {
        const grid_now = this.current_grid
        const formatted_seed = new_seed.map(row => [...row])
        dig.clear_grid(grid_now)
        dig.clear_grid(this.next_grid) // Ensure both buffers are clean
        dig.add_seed(formatted_seed, grid_now)

        // Re-sync live_cells after loading seed
        this.live_cells = []
        for (let y = 0; y < this.grid_height; y++) {
            for (let x = 0; x < this.grid_width; x++) {
                if (grid_now[y][x] !== '⬛') {
                    this.live_cells.push({ x, y, state: grid_now[y][x], gen_count: this.gen_count })
                }
            }
        }
        this.next_live_cells_to_clear = []

        this.new_pause_countdown = this.settings.NEW_PAUSE_MSEC
        this.gen_count = 0
        this.msec_to_next_gen = 0
        this.is_stable = false
        this.history = []
        this.glider_id_counter = 1
        this.active_gliders = []
        this._detect_gliders()
    }

    _generate_orientations(templates) {
        const results = []
        
        const rotate = (p) => {
            const h = p.length, w = p[0].length
            const res = Array.from({length: w}, () => Array(h))
            for(let y=0; y<h; y++) {
                const row = Array.from(p[y])
                for(let x=0; x<w; x++) res[x][h-1-y] = row[x]
            }
            return res.map(r => r.join(''))
        }

        const flip = (p) => p.map(row => Array.from(row).reverse().join(''))

        for (const steps of templates) {
            let current_steps = steps
            for (let r = 0; r < 4; r++) {
                results.push(this._parse_steps(current_steps))
                results.push(this._parse_steps(current_steps.map(s => flip(s))))
                current_steps = current_steps.map(s => rotate(s))
            }
        }
        return results
    }

    _parse_steps(steps) {
        return steps.map(step_rows => {
            const live = [], anchor = {x: 0, y: 0}
            step_rows.forEach((row, y) => {
                Array.from(row).forEach((char, x) => {
                    if (char === '⬜') live.push({x, y})
                    if (char === '⚓') anchor.x = x, anchor.y = y
                })
            })
            return { live, anchor }
        })
    }

    _detect_gliders() {
        const next_glider_candidates = []
        const claimed_cells = new Set()

        // 1. Scan for ALL potential gliders in the current grid
        for (const cell of this.live_cells) {
            if (claimed_cells.has(`${cell.x},${cell.y}`)) continue

            let found_for_cell = false
            for (let i = 0; i < this.orientations.length; i++) {
                const orientation = this.orientations[i]
                for (let p = 0; p < orientation.length; p++) {
                    const phase = orientation[p]
                    
                    for (const start_p_cell of phase.live) {
                        const ox = cell.x - start_p_cell.x
                        const oy = cell.y - start_p_cell.y

                        if (this._check_pattern(ox, oy, phase)) {
                            // Found a candidate. Verify no cells are already claimed
                            let already_claimed = false
                            for (const p_cell of phase.live) {
                                if (claimed_cells.has(`${ox + p_cell.x},${oy + p_cell.y}`)) {
                                    already_claimed = true; break
                                }
                            }

                            if (!already_claimed) {
                                next_glider_candidates.push({ x: ox, y: oy, phase: p, orientation_idx: i, cells: phase.live.map(pc => ({x: ox + pc.x, y: oy + pc.y})) })
                                // Claim all cells in this glider
                                for (const p_cell of phase.live) {
                                    claimed_cells.add(`${ox + p_cell.x},${oy + p_cell.y}`)
                                }
                                found_for_cell = true
                                break
                            }
                        }
                    }
                    if (found_for_cell) break
                }
                if (found_for_cell) break
            }
        }

        // 2. Identity Persistence: Match candidates against previously active gliders
        const updated_active_gliders = []
        for (const candidate of next_glider_candidates) {
            let matched_id = null
            
            // Look for a previous glider that is "close" to this candidate
            // A glider moves max 1 cell per gen, so search in a 3x3 neighborhood of its old top-left
            for (const prev of this.active_gliders) {
                const dx = Math.abs(candidate.x - prev.x)
                const dy = Math.abs(candidate.y - prev.y)
                // Also check if orientation matches (gliders don't turn)
                if (dx <= 2 && dy <= 2 && candidate.orientation_idx === prev.orientation_idx) {
                    matched_id = prev.id
                    break
                }
            }

            const id = matched_id || this.glider_id_counter++
            updated_active_gliders.push({ ...candidate, id })
            
            // Tag cells for the renderer
            for (const c of candidate.cells) {
                const live_cell = this.live_cells.find(lc => lc.x === c.x && lc.y === c.y)
                if (live_cell) live_cell.glider_id = id
            }
        }

        this.active_gliders = updated_active_gliders
    }

    _check_pattern(ox, oy, phase) {
        for (const p_cell of phase.live) {
            const tx = ox + p_cell.x, ty = oy + p_cell.y
            if (tx < 0 || tx >= this.grid_width || ty < 0 || ty >= this.grid_height) return false
            if (this.current_grid[ty][tx] === '⬛') return false
        }
        
        // Strict Moat: ensure no OTHER live cells are in the 5x5 bounding box
        for (let y = 0; y < 5; y++) {
            const ty = oy + y
            if (ty < 0 || ty >= this.grid_height) continue
            for (let x = 0; x < 5; x++) {
                const tx = ox + x
                if (tx < 0 || tx >= this.grid_width) continue
                
                if (this.current_grid[ty][tx] !== '⬛') {
                    // Check if this coordinate is part of the required live cells
                    let is_glider_cell = false
                    for (const p_cell of phase.live) {
                        if (p_cell.x === x && p_cell.y === y) {
                            is_glider_cell = true
                            break
                        }
                    }
                    if (!is_glider_cell) return false
                }
            }
        }
        
        return true
    }

    _get_state_hash() {
        let hash = ""
        let live_count = this.live_cells.length
        // Sort live cells to ensure consistent hash regardless of order in list
        // (Though apply_rules currently returns them in y-then-x order anyway)
        for (const cell of this.live_cells) {
            hash += `${cell.x},${cell.y}|`
        }
        return { hash, live_count }
    }

    _check_stability() {
        if (this.is_stable) return

        const { hash, live_count } = this._get_state_hash()

        // 1. Check for Extinction
        if (live_count === 0) {
            this.is_stable = true
            console.log(`⏹ STABILIZED: Extinct at Gen ${this.gen_count}`)
            return
        }

        // 2. Check for Loops/Static (within 8 generations)
        if (this.history.includes(hash)) {
            this.is_stable = true
            console.log(`⏹ STABILIZED: Loop detected at Gen ${this.gen_count}`)
            return
        }

        // 3. Update History
        this.history.push(hash)
        if (this.history.length > 8) {
            this.history.shift()
        }
    }
}
