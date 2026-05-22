////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, 2025 David 'Duppy' Proctor, Interface Arts
//
//  conway
//      play
////////////////////////////////////////////////////////////////////////////////

import { rule_sets } from './rules.js'

let rule_mode
let rules

const set_rule_mode = (new_mode) => {
    rule_mode = new_mode
    rules = rule_sets[rule_mode]
}

set_rule_mode('🟥🟦')
// start in red blue mode, but if we ever see a '⬜', switch permanently to Conway mode

// add_seed
// INPUT a seed and a destination grid
// TODO LOW PRI accept an optional x,y offset for the seed, default to center
//    copy (overwriting) seed to the center of the destination grid
// RETURN nothing, modifies destination array
export const add_seed = (seed, grid) => {
    if (!seed?.length)
        return
    const sh = seed.length, sw = seed ? seed[0].length : 0 // WARN assumes seed[0] is same length as all rows
    const gh = grid.length, gw = grid[0].length
    // coordinates of upper left corner of seed when seed is centered in grid
    const cx = Math.round((gw - sw) / 2)
    const cy = Math.round((gh - sh) / 2)
    // loop over seed and copy each cell into the center of grid
    set_rule_mode('🟥🟦')
    for (let y = cy, sy = 0; sy < sh; y++, sy++) {
        for (let x = cx, sx = 0; sx < sw; x++, sx++) {
            // clip instead of wrap
            if (x >= 0 && y >= 0 && x < gw && y < gh) {
                // must make sure rows are arrays, not strings
                grid[y][x] = seed[sy][sx]
                if (seed[sy][sx] == '⬜') {
                    // any use of '⬜' will switch to Conway mode
                    set_rule_mode('⬜')
                }
            }
        }
    }
} // end add_seed()

// apply_rules
// INPUT a read-only 2D Array old grid, pre-allocted 2D array for the new grid
//       optional current live_cells list, and optional cells_to_clear list for new_grid
//     run Conway's Game of Life rules on it
// RETURN an array of live cells [{x, y, state}] if successful, null if error    
export const apply_rules = (grid, new_grid, live_cells, cells_to_clear) => {
    // get the height and width of the grid
    const h = grid.length, w = grid[0].length
    // check that the new_grid is the same size as grid
    if (new_grid.length != h || new_grid[0].length != w) {
        console.error(`apply_rules() error: new_grid is not the same size as grid`)
        return null
    }

    if (live_cells) {
        // --- SPARSE PATH ---
        
        // 1. Clear the new_grid of cells that were live 2 generations ago
        if (cells_to_clear) {
            for (const cell of cells_to_clear) {
                new_grid[cell.y][cell.x] = '⬛'
            }
        }

        // 2. Identify all candidate cells (live cells and their neighbors)
        // Map key: (y << 16) | x
        const candidates = new Map()

        for (const cell of live_cells) {
            const key = (cell.y << 16) | cell.x
            let stats = candidates.get(key)
            if (!stats) {
                stats = { live: 0, red: 0, state: cell.state }
                candidates.set(key, stats)
            } else {
                stats.state = cell.state
            }

            // Increment neighbor counts for all 8 neighbors
            for (let dy = -1; dy <= 1; dy++) {
                const ny = cell.y + dy
                if (ny < 0 || ny >= h) continue
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue
                    const nx = cell.x + dx
                    if (nx < 0 || nx >= w) continue

                    const nkey = (ny << 16) | nx
                    let nstats = candidates.get(nkey)
                    if (!nstats) {
                        nstats = { live: 0, red: 0, state: '⬛' }
                        candidates.set(nkey, nstats)
                    }
                    nstats.live++
                    if (cell.state === '🟥') nstats.red++
                }
            }
        }

        // 3. Apply rules to all candidates
        const next_live_cells = []
        for (const [key, stats] of candidates) {
            const x = key & 0xFFFF
            const y = key >>> 16
            
            const lookup = rules[stats.state]
            const next_state = lookup[stats.live][stats.red]
            
            if (next_state !== '⬛') {
                new_grid[y][x] = next_state
                next_live_cells.push({ x, y, state: next_state })
            }
        }
        return next_live_cells

    } else {
        // --- DENSE FALLBACK ---
        const next_live_cells = []
        let peek, lookup
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let live_count = 0
                let red_count = 0
                for (let ny = y - 1; ny <= y + 1; ny++) {
                    for (let nx = x - 1; nx <= x + 1; nx++) {
                        if (nx == x && ny == y) continue
                        if (nx >= 0 && ny >= 0 && nx < w && ny < h) {
                            peek = grid[ny][nx]
                        } else {
                            peek = '⬛'
                        }
                        live_count += (peek != '⬛' ? 1 : 0)
                        red_count += (peek == '🟥' ? 1 : 0)
                    }
                }
                peek = grid[y][x]
                lookup = rules[peek]
                if (!lookup) {
                    console.error(`apply_rules() error: unknown cell state '${peek}'`)
                    return null
                }
                const next_state = lookup[live_count][red_count]
                new_grid[y][x] = next_state
                if (next_state !== '⬛') {
                    next_live_cells.push({ x, y, state: next_state })
                }
            }
        }
        return next_live_cells
    }
} // end apply_rules()

export const clear_grid = (grid) => {
    set_rule_mode('🟥🟦')
    // any use of '⬜' will switch to Conway mode
    for (let row of grid) {
        for (let i = 0; i < row.length; i++) {
            row[i] = '⬛'
        }
    }
} // end clear_grid()
