////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, David 'Duppy' Proctor, Interface Arts
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
//     run Conway's Game of Life rules on it
// RETURN true if successful, false if error    
export const apply_rules = (grid, new_grid) => {
    // get the height and width of the grid
    const h = grid.length, w = grid[0].length
    // check that the new_grid is the same size as the grid
    if (new_grid.length != h || new_grid[0].length != w) {
        console.error(`apply_rules() error: new_grid is not the same size as grid`)
        return false
    }

    // loop over 2D array cells
    // and apply the rules to each cell
    let peek, lookup
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // count the number of neighbors that are live
            let live_count = 0
            let red_count = 0
            // don't need blue count because it can be computed from live_count - red_count
            // loop over the 3x3 grid around the cell
            for (let ny = y - 1; ny <= y + 1; ny++) {
                for (let nx = x - 1; nx <= x + 1; nx++) {
                    // don't count the cell itself, it is not a neighbor
                    if (nx == x && ny == y) continue
                    if (nx >= 0 && ny >= 0 && nx < w && ny < h) {
                        peek = grid[ny][nx]
                    } else {
                        peek = '⬛' // all cells outside the grid are dead
                    }
                    // count the live neighbors
                    // TODO fix this to use is_red() and is_live()
                    live_count += (peek != '⬛')
                    red_count += (peek == '🟥')
                    // blue_count += (peek == '🟦')
                    // Unnecessary, blue_count is implied by live_count - red_count
                }
            }
            peek = grid[y][x]
            lookup = rules[peek]
            if (!lookup) {
                console.error(`apply_rules() error: unknown cell state '${peek}'`)
                return false
            }
            new_grid[y][x] = lookup[live_count][red_count]
        }
    }
    return true
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
