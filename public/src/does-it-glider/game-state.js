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

        if (this.msec_to_next_gen <= 0) {
            this.msec_to_next_gen += this.msec_per_gen
            
            if (this.new_pause_countdown <= 0 && this.gen_count < 9999) {
                dig.apply_rules_old_new(this.current_grid, this.next_grid)
                this.ping_pong = !this.ping_pong
                this.gen_count++
                gen_advanced = true
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
        dig.add_seed(formatted_seed, grid_now)
        this.new_pause_countdown = this.settings.NEW_PAUSE_MSEC
        this.gen_count = 0
        this.msec_to_next_gen = 0
        this.is_stable = false
        this.history = []
    }

    _get_state_hash() {
        let hash = ""
        let live_count = 0
        for (let y = 0; y < this.grid_height; y++) {
            for (let x = 0; x < this.grid_width; x++) {
                if (this.current_grid[y][x] !== '⬛') {
                    hash += `${x},${y}|`
                    live_count++
                }
            }
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
