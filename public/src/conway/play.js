////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  conway
//      play
////////////////////////////////////////////////////////////////////////////////

import { settings } from '/src/does-it-glider/settings.js'
import { rules } from '/src/conway/rules.js'

// play Conway's Game of Life

// start in red blue mode, but if we ever see a '⬜', switch permanently to Conway mode
let rule_mode = '🟥🟦'

// add_seed
// INPUT a seed and a destination grid
// TODO LOW PRI accept an optional x,y offset for the seed, default to center
//    copy (overwriting) seed to the center of the destination grid
// RETURN nothing, modifies destination array
export const add_seed = (seed, grid) => {
    const sh = seed.length, sw = seed[0].length // WARN assumes seed[0] is same length as all rows
    const gh = grid.length, gw = grid[0].length
    // coordinates of upper left corner of seed when seed is centered in grid
    const cx = Math.round((gw - sw) / 2)
    const cy = Math.round((gh - sh) / 2)
    // loop over seed and copy each cell into the center of grid
    for (let y = cy, sy = 0; sy < sh; y++, sy++) {
        for(let x = cx, sx = 0; sx < sw; x++, sx++) {
            // clip instead of wrap
            if (x >= 0 && y >= 0 && x < gw && y < gh) {
                // BUG #12 this doesn't work when unicode characters are in a string
                // must make sure rows are arrays, not strings
                grid[y][x] = seed[sy][sx]
            }
        }   
    }
} // end add_seed()


// apply_rules
// INPUT a read-only 2D Array old grid, pre-allocted 2D array for the new grid state
//     run Conway's Game of Life rules on it
// RETURN true if successful, false if error    
export const apply_rules = (grid, new_grid) => {
    let success = true
    // get the height and width of the state
    const h = grid.length, w = grid[0].length
    // check that the new_grid is the same size as the grid
    if (new_grid.length != h || new_grid[0].length != w) {
        console.error(`apply_rules() error: new_grid is not the same size as grid`)
        return false
    }
    
    // loop over 2D array state
    // and apply the rules to each cell
    for(let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // if we see a '⬜' anywhere, change the rules to Conway mode
            if (rule_mode == '🟥🟦' && grid[y][x] == '⬜') {
                rule_mode = '⬜'
            }
            if (rule_mode == '⬜' && (grid[y][x] == '🟥' || grid[y][x] == '🟦')) {
                grid[y][x] = '⬜'
            }
            // count the number of neighbors that are alive
            let live_neighbors = 0
            let red_team_neighbors = 0
            // don't need blue count because it can be computed from live_neighbors - red_team_neighbors
            // loop over the 3x3 grid around the cell
            let peek = '⬛'
            for(let ny = y-1; ny <= y+1; ny++) {
                for(let nx = x-1; nx <= x+1; nx++) {
                    // don't count the cell itself, it is not a neighbor
                    if (nx == x && ny == y) continue
                    if (settings.WRAP_GRID) {
                        // wrap around the edges of the grid
                        peek = grid[(ny + h) % h][(nx + w) % w]
                    } else {
                        // don't wrap
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
                            peek = '⬛' // HACK a continue might be faster, but I'm opting for clarity
                        } else {
                            peek = grid[ny][nx]
                        }
                    }
                    // count the alive neighbors
                    if (peek == 'o' || peek == '.' || peek == '⬛') {
                        peek = '⬛'
                        continue
                    }
                    live_neighbors += 1
                    if (peek == '🟥' || peek == 'R') { // TODO fix this to use is_red_team()
                        red_team_neighbors += 1
                    }
                        // blue_team_neighbors += 1
                        // Don't count blue neighbors here because it can be computed from live_neighbors - red_team_neighbors
                }
            }
            if (rule_mode == '⬜') {
                red_team_neighbors = 9 // HACK force the result to be Conway, not red v blue
                if (peek != '⬛') {
                    peek = '⬜'
                }
            }
            // blue_team_neighbors = live_neighbors - red_team_neighbors
            // don't need to track blue_team_neighbors because we calc from red_team_neighbors
            if (rules[grid[y][x]]) {
                new_grid[y][x] = rules[grid[y][x]][live_neighbors][red_team_neighbors]
            } else {
                success = false
                console.error(`apply_rules() error: unknown cell state ${grid[y][x]}`)
            }
        }
    }
    return success
} // end apply_rules()
