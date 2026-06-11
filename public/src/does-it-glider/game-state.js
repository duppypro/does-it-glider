//////////////////////////////////////////////////////////////////////
//  (c) 2023-2026 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider
//      game-state
//////////////////////////////////////////////////////////////////////

import * as dig from './imports.js'
import * as local_stats from './local-stats.js'

export class GameState {
    constructor(width, height, settings) {
        // Statically sized algorithmic grid (2048x2048)
        this.grid_width = 2048
        this.grid_height = 2048
        this.settings = settings

        // Initialize visual boundary dimensions (starts at 128x128 centered at 1024, 1024)
        this.vis_width = 128
        this.vis_height = 128
        this.vis_left = 1024 - 64   // 960
        this.vis_top = 1024 - 64    // 960
        this.vis_right = 1024 + 64  // 1088
        this.vis_bottom = 1024 + 64 // 1088

        // Initialize grids at absolute 2048x2048 size
        this.grid_ping = Array.from({ length: 2048 }, () => Array.from({ length: 2048 }, () => '⬛'))
        this.grid_pong = Array.from({ length: 2048 }, () => Array.from({ length: 2048 }, () => '⬛'))
        this.ping_pong = true // true when ping is current, false when pong is current

        this.gen_count = 0
        this.new_pause_countdown = settings.NEW_PAUSE_MSEC
        this.speed_multiplier = 1.0
        this.msec_per_gen = settings.MSEC_PER_GEN
        this.msec_to_next_gen = 0
        this.is_paused = false
        this.is_stable = false
        this.history = [] // Circular buffer of last 8 state hashes
        this.live_cells = []
        this.next_live_cells_to_clear = [] // Tracks live cells in the 'next' buffer for sparse clearing

        this.glider_id_counter = 1
        this.mature_gliders_count = 0
        this.tragic_fizzles_count = 0
        this.escaped_gliders_count = 0
        this.active_gliders = [] // [{id, x, y, phase, orientation_idx, age, is_mature}]
        this.orientations = this._generate_orientations(dig.glider_templates)
    }

    toggle_pause() {
        this.is_paused = !this.is_paused
        return this.is_paused
    }

    set_speed_multiplier(multiplier) {
        this.speed_multiplier = multiplier
        this.msec_per_gen = this.settings.MSEC_PER_GEN / multiplier
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
                this._check_and_expand_grid()
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
        // Reset grid dimensions back to absolute size (2048x2048) and visual bounds back to 128x128
        this.grid_width = 2048
        this.grid_height = 2048
        this.vis_width = 128
        this.vis_height = 128
        this.vis_left = 1024 - 64   // 960
        this.vis_top = 1024 - 64    // 960
        this.vis_right = 1024 + 64  // 1088
        this.vis_bottom = 1024 + 64 // 1088

        // Reallocate starting-size grid arrays at 2048x2048
        this.grid_ping = Array.from({ length: 2048 }, () => Array.from({ length: 2048 }, () => '⬛'))
        this.grid_pong = Array.from({ length: 2048 }, () => Array.from({ length: 2048 }, () => '⬛'))
        this.ping_pong = true // reset to ping being current

        const grid_now = this.current_grid
        const formatted_seed = new_seed.map(row => [...row])
        dig.clear_grid(grid_now)
        dig.clear_grid(this.next_grid) // Ensure both buffers are clean
        dig.add_seed(formatted_seed, grid_now)

        // Resync physical grid canvas in DOM/SVG using the starting 128x128 visual boundary
        dig.update_grid_dimensions(128, 128)

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
        this.speed_multiplier = 1.0
        this.msec_per_gen = this.settings.MSEC_PER_GEN
        this.gen_count = 0
        this.msec_to_next_gen = 0
        this.is_stable = false
        this.stable_cycle_length = null
        this.history = []
        this.glider_id_counter = 1
        this.mature_gliders_count = 0
        this.tragic_fizzles_count = 0
        this.escaped_gliders_count = 0
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
            const safe_noise = []
            
            step_rows.forEach((row, y) => {
                Array.from(row).forEach((char, x) => {
                    if (char === '⬜') live.push({x, y})
                    if (char === '⚓') anchor.x = x, anchor.y = y
                    if (char === 'S') safe_noise.push({x, y})
                })
            })
            return { live, anchor, safe_noise }
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
        const matched_prev_ids = new Set()

        for (const candidate of next_glider_candidates) {
            let matched_id = null
            let age = 0
            let is_mature = false
            let counted_as_escaped = false
            
            // Look for a previous glider that is "close" to this candidate
            // A glider moves max 1 cell per gen, so search in a 3x3 neighborhood of its old top-left
            for (const prev of this.active_gliders) {
                const dx = Math.abs(candidate.x - prev.x)
                const dy = Math.abs(candidate.y - prev.y)
                // Also check if orientation matches (gliders don't turn)
                if (dx <= 2 && dy <= 2 && candidate.orientation_idx === prev.orientation_idx) {
                    matched_id = prev.id
                    age = prev.age + 1
                    is_mature = prev.is_mature
                    counted_as_escaped = prev.counted_as_escaped || false
                    matched_prev_ids.add(prev.id)
                    break
                }
            }

            if (matched_id) {
                if (age === 4 && !is_mature) {
                    is_mature = true
                    this.mature_gliders_count++
                }
            } else {
                matched_id = this.glider_id_counter++
            }

            updated_active_gliders.push({ ...candidate, id: matched_id, age, is_mature, counted_as_escaped })
            
            // Tag cells for the renderer
            for (const c of candidate.cells) {
                const live_cell = this.live_cells.find(lc => lc.x === c.x && lc.y === c.y)
                if (live_cell) live_cell.glider_id = matched_id
            }
        }

        // 3. Track deaths (failed proto-gliders)
        for (const prev of this.active_gliders) {
            if (!matched_prev_ids.has(prev.id)) {
                if (!prev.is_mature) {
                    this.tragic_fizzles_count++
                }
            }
        }

        // 4. Evaporate escaping gliders cleanly & handle instant visual escape tracking
        const remaining_active_gliders = []
        let escaped_this_tick = 0

        for (const glider of updated_active_gliders) {
            // Stage 1: Instant Visual-Border Escape Tracking
            let is_fully_outside_vis = true
            for (const cell of glider.cells) {
                if (cell.x >= this.vis_left && cell.x < this.vis_right && cell.y >= this.vis_top && cell.y < this.vis_bottom) {
                    is_fully_outside_vis = false
                    break
                }
            }

            if (is_fully_outside_vis && glider.is_mature && !glider.counted_as_escaped) {
                glider.counted_as_escaped = true
                this.escaped_gliders_count++
                console.log(`✨ GLIDER LAUNCHED! Glider ID ${glider.id} released into the wild at x:${glider.x}, y:${glider.y}`)
            }

            // Stage 2: Absolute Edge Evaporation (at 2048x2048)
            let touches_absolute_boundary = false
            for (const cell of glider.cells) {
                if (cell.x <= 2 || cell.y <= 2 || cell.x >= this.grid_width - 3 || cell.y >= this.grid_height - 3) {
                    touches_absolute_boundary = true
                    break
                }
            }

            if (touches_absolute_boundary) {
                // Clear the cells in both current and next grids to prevent border debris
                const curr = this.current_grid
                const next = this.next_grid
                for (const cell of glider.cells) {
                    curr[cell.y][cell.x] = '⬛'
                    next[cell.y][cell.x] = '⬛'
                }

                // Remove from live_cells
                this.live_cells = this.live_cells.filter(lc => {
                    return !glider.cells.some(gc => gc.x === lc.x && gc.y === lc.y)
                })

                // Remove from next_live_cells_to_clear
                this.next_live_cells_to_clear = this.next_live_cells_to_clear.filter(lc => {
                    return !glider.cells.some(gc => gc.x === lc.x && gc.y === lc.y)
                })

                console.log(`✨ GLIDER EVAPORATED! Glider ID ${glider.id} dissolved at absolute boundary x:${glider.x}, y:${glider.y}`)
            } else {
                remaining_active_gliders.push(glider)
            }
        }

        this.active_gliders = remaining_active_gliders
        if (escaped_this_tick > 0) {
            this.escaped_gliders_count += escaped_this_tick
        }
    }

    _check_pattern(ox, oy, phase) {
        for (const p_cell of phase.live) {
            const tx = ox + p_cell.x, ty = oy + p_cell.y
            if (tx < 0 || tx >= this.grid_width || ty < 0 || ty >= this.grid_height) return false
            if (this.current_grid[ty][tx] === '⬛') return false
        }
        
        // Moat: ensure no OTHER live cells are in the 5x5 bounding box
        // Exception: allow noise in designated 'safe_noise' coordinates 
        for (let y = 0; y < 5; y++) {
            const ty = oy + y
            if (ty < 0 || ty >= this.grid_height) continue
            for (let x = 0; x < 5; x++) {
                const tx = ox + x
                if (tx < 0 || tx >= this.grid_width) continue
                
                if (this.current_grid[ty][tx] !== '⬛') {
                    // Check if this coordinate is part of the required live cells
                    let is_allowed = false
                    for (const p_cell of phase.live) {
                        if (p_cell.x === x && p_cell.y === y) {
                            is_allowed = true
                            break
                        }
                    }
                    if (!is_allowed) {
                        for (const s_cell of phase.safe_noise) {
                            if (s_cell.x === x && s_cell.y === y) {
                                is_allowed = true
                                break
                            }
                        }
                    }
                    if (!is_allowed) return false
                }
            }
        }
        
        return true
    }

    _get_state_hash() {
        // Collect all coordinates currently claimed by active gliders
        const glider_cell_set = new Set()
        for (const glider of this.active_gliders) {
            for (const cell of glider.cells) {
                glider_cell_set.add(`${cell.x},${cell.y}`)
            }
        }

        // Filter: keep cells inside visual boundary OR non-glider cells outside
        const filtered_cells = this.live_cells.filter(cell => {
            const is_inside_vis = (cell.x >= this.vis_left && cell.x < this.vis_right && cell.y >= this.vis_top && cell.y < this.vis_bottom)
            const is_glider = glider_cell_set.has(`${cell.x},${cell.y}`)
            return is_inside_vis || !is_glider
        })

        let hash = ""
        for (const cell of filtered_cells) {
            hash += `${cell.x},${cell.y}|`
        }
        return { hash, live_count: filtered_cells.length }
    }

    _check_stability() {
        if (this.is_stable) return

        // Delay stability if any mature glider is still actively crossing the visual boundary
        let is_any_glider_crossing = false
        for (const glider of this.active_gliders) {
            if (glider.is_mature) {
                let has_cell_inside = false
                for (const cell of glider.cells) {
                    if (cell.x >= this.vis_left && cell.x < this.vis_right && cell.y >= this.vis_top && cell.y < this.vis_bottom) {
                        has_cell_inside = true
                        break
                    }
                }
                if (has_cell_inside) {
                    is_any_glider_crossing = true
                    break
                }
            }
        }

        if (is_any_glider_crossing) {
            // Keep running to let the glider fully cross the border and escape!
            return
        }

        const { hash, live_count } = this._get_state_hash()

        // 1. Check for Extinction
        if (live_count === 0) {
            this.is_stable = true
            this.stable_cycle_length = 0
            console.log(`⏹ STABILIZED: Extinct at Gen ${this.gen_count}`)
            return
        }

        // 2. Check for Loops/Static (within 8 generations)
        const loop_idx = this.history.indexOf(hash)
        if (loop_idx !== -1) {
            this.is_stable = true
            // The history array appends to the end, so a match at index N
            // means the cycle length is (current_length - matched_index)
            this.stable_cycle_length = this.history.length - loop_idx
            console.log(`⏹ STABILIZED: Loop detected at Gen ${this.gen_count} (Cycle length: ${this.stable_cycle_length})`)
            return
        }

        // 3. Update History
        this.history.push(hash)
        if (this.history.length > 8) {
            this.history.shift()
        }
    }

    _check_and_expand_grid() {
        // Absolute grid calculations are fixed at 2048x2048. 
        // We only expand the Visual Grid centered in the algorithm grid.
        let non_glider_breach = false

        // Collect all coordinates currently claimed by active gliders
        const glider_cell_set = new Set()
        for (const glider of this.active_gliders) {
            for (const cell of glider.cells) {
                glider_cell_set.add(`${cell.x},${cell.y}`)
            }
        }

        // Check if any non-glider cell has breached the current visual bounds
        for (const cell of this.live_cells) {
            const is_glider_cell = glider_cell_set.has(`${cell.x},${cell.y}`)
            if (!is_glider_cell) {
                if (cell.x < this.vis_left || cell.x >= this.vis_right || cell.y < this.vis_top || cell.y >= this.vis_bottom) {
                    non_glider_breach = true
                    break
                }
            }
        }

        if (non_glider_breach) {
            const pad = 64
            this.vis_left -= pad
            this.vis_right += pad
            this.vis_top -= pad
            this.vis_bottom += pad
            
            this.vis_width += pad + pad
            this.vis_height += pad + pad

            // Update physical grid size in DOM/SVG to match new visual dimensions
            dig.update_grid_dimensions(this.vis_width, this.vis_height)

            console.log(`🚀 VISUAL GRID EXPANDED to ${this.vis_width}x${this.vis_height} due to non-glider boundary breach!`)
        }
    }

    get_visible_live_cells() {
        const visible = []
        for (const cell of this.live_cells) {
            if (cell.x >= this.vis_left && cell.x < this.vis_right && cell.y >= this.vis_top && cell.y < this.vis_bottom) {
                visible.push({
                    ...cell,
                    x: cell.x - this.vis_left,
                    y: cell.y - this.vis_top
                })
            }
        }
        return visible
    }
}
