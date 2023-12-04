////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  conway
//      play
////////////////////////////////////////////////////////////////////////////////

import { settings } from '/src/does-it-glider/settings.js'

// play Conway's Game of Life

// start in red blue mode, but if we ever see a '⬜', switch permanently to white mode
let rule_set = '🟥🟦'

// add_seed
// INPUT a seed and a destination grid
// TODO LOW PRI accept an optional x,y offset for the seed, default to center
//    copy (overwriting) seed to the center of the destination grid
// RETURN nothing, modifies destination array
export const add_seed = (seed, grid) => {
    const sh = seed.length, sw = seed[0].length // HACK assumes seed[0] is same length as all rows
    const gh = grid.length, gw = grid[0].length
    // coordinates of upper left corner of seed when seed is centered in grid
    const cx = Math.round((gw - sw) / 2), cy = Math.round((gh - sh) / 2)
    // loop over seed wrapping around if needed
    // and copy each cell into the center of grid
    for (let y = cy, sy = 0; sy < sh; y++, sy++) {
        for(let x = cx, sx = 0; sx < sw; x++, sx++) {
            // copy the seed into the grid, cropping if needed
            if (settings.WRAP_GRID) {
                // wrap around the edges of the grid
                grid[(y + gh) % gh][(x + gw) % gw] = seed[sy][sx]
            } else {
                // clip instead of wrap
                if (x >=0 && y >= 0 && x < gw && y < gh) {
                    grid[y][x] = seed[sy][sx]
                }
            }
        }   
    }
} // end add_seed()

// Conway's Game of Life rules are:
// 1. Dead cells with three live neighbours become a live cell.
// 2. Dead cells with <3 or >3 neighbours stay dead.
// 3. A live cell with 2 or 3 live neighbours stays alive.
// 4. A live cell with <2 or >3 live neighbours dies.
// '⬜' is a live cell, also 'b' or 'X'
// '⬛' is a dead cell, also 'o' or '.'
const CONWAY_RULES_LOOKUP = { // Original Conway's Game of Life rules
    '⬜': [ // rule lookup for live cells
        '⬛', // with 0 neighbors, dies
        '⬛', // with 1 neighbors, dies
        '⬜', // with 2 neighbors, stays alive
        '⬜', // with 3 neighbors, stays alive
        '⬛', // with 4 neighbors, dies
        '⬛', // with 5 neighbors, dies
        '⬛', // with 6 neighbors, dies
        '⬛', // with 7 neighbors, dies
        '⬛', // with 8 neighbors, dies
    ],
    '⬛': [ // rule lookup for dead cells
        '⬛', // with 0 neighbors, stays dead
        '⬛', // with 1 neighbors, stays dead
        '⬛', // with 2 neighbors, stays dead
        '⬜', // with 3 neighbors, becomes alive
        '⬛', // with 4 neighbors, stays dead
        '⬛', // with 5 neighbors, stays dead
        '⬛', // with 6 neighbors, stays dead
        '⬛', // with 7 neighbors, stays dead
        '⬛', // with 8 neighbors, stays dead
    ],
}
//
// Red Team🟥 Blue Team🟦 rules are:
// '🟥' is a live red team cell, also 'R'
// '🟦' is a live blue team cell. also 'B'
// '⬛' is a dead cell, also 'o' or '.'
// 0. If you treat both red and blue cells as live, the rules produce the same result as Conway's Game of Life.
// 1. Dead cells with 3 neighbours become a red cell if 2 or 3 are red.        🟥🟥🟦, 🟥🟥🟥
// 2. Dead cells with 3 neighbours become a blue cell if 2 or 3 are blue.      🟦🟦🟥, 🟦🟦🟦
// 3. Dead cells with <3 or >3 neighbours stay dead.
// 3. A red cell with 3 neighbours and 1, 2, 3 red neighbours stays red.       🟥🟦🟦, 🟥🟥🟦, 🟥🟥🟥
// 4. A red cell with 3 neighbours and 0 red neighbours (3 blue) becomes blue. 🟦🟦🟦
// 5. A red cell with 2 neighbours and 1, 2 red neighbours stays red.          🟥🟦, 🟥🟥
// 6. A red cell with 2 neighbours and 0 red neighbours (2 blue) becomes blue. 🟦🟦
// 7. A red cell with <2 or >3 neighbours of any color dies.
// 8. A blue cell with 3 neighbours and 1, 2, 3 blue neighbours stays blue.    🟦🟥🟥, 🟦🟦🟥, 🟦🟦🟦
// 9. A blue cell with 3 neighbours and 0 blue neighbours (3 red) becomes red. 🟥🟥🟥
// 10. A blue cell with 2 neighbours and 1, 2 blue neighbours stays blue.      🟦🟥, 🟦🟦
// 11. A blue cell with 2 neighbours and 0 blue neighbours (2 red) becomes red.🟥🟥
// 12. A blue cell with <2 or >3 neighbours of any color dies.
const RED_TEAM_BLUE_TEAM_LOOKUP = {
    // lookup new cell by old state, count of live neighbors, and count of red neighbors
    // count of blue neighbors is always live_neighbors - red_neighbors, it's value is redundant
    // arbitrarily chose to index by count of red neighbors
    // Example: new_state = RED_TEAM_BLUE_TEAM_LOOKUP[old_state][live_neighbors][red_neighbors]
    '🟥': [
            /* 0 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 1 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 2 */['🟦', '🟥', '🟥', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 3 */['🟦', '🟥', '🟥', '🟥', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 4 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 5 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 6 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 7 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 8 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    ],
    '🟦': [
            // REMEMBER: we index by red neighbors, so the rule at index(row) 2 is the rule for 2 live neighbors
            // 2nd row first element is 2 - 0 -> 2 blue neighbors, next element is 2 - 1 -> 1 blue neighbor, etc.  
            /* 0 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 1 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 2 */['🟦', '🟦', '🟥', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 3 */['🟦', '🟦', '🟦', '🟥', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 4 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 5 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 6 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 7 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 8 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    ],
    '⬛': [
            /* 0 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 1 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 2 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 3 */['🟦', '🟦', '🟥', '🟥', '⬜', '⬜', '⬜', '⬜', '⬜'], // HACK overloading the meaning of red_team_neighbors
            /* 4 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 5 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 6 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 7 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 8 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    ],
    '⬜': [
            /* 0 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 1 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 2 */['⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜'],
            /* 3 */['⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜'],
            /* 4 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 5 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 6 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 7 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
            /* 8 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    ],
}
// add aliases for cell values
RED_TEAM_BLUE_TEAM_LOOKUP['R'] = RED_TEAM_BLUE_TEAM_LOOKUP['🟥']
RED_TEAM_BLUE_TEAM_LOOKUP['B'] = RED_TEAM_BLUE_TEAM_LOOKUP['🟦']
RED_TEAM_BLUE_TEAM_LOOKUP['o'] = RED_TEAM_BLUE_TEAM_LOOKUP['⬛']
RED_TEAM_BLUE_TEAM_LOOKUP['.'] = RED_TEAM_BLUE_TEAM_LOOKUP['⬛']
RED_TEAM_BLUE_TEAM_LOOKUP['b'] = RED_TEAM_BLUE_TEAM_LOOKUP['⬜']
RED_TEAM_BLUE_TEAM_LOOKUP['X'] = RED_TEAM_BLUE_TEAM_LOOKUP['⬜']

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
            // if we see a '⬜' anywhere, change the rules to white mode
            if (rule_set == '🟥🟦' && grid[y][x] == '⬜') {
                rule_set = '⬜'
            }
            if (rule_set == '⬜' && (grid[y][x] == '🟥' || grid[y][x] == '🟦')) {
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
            if (rule_set == '⬜') {
                red_team_neighbors = 8 // HACK force the result to be white, not red or blue
            }
            // blue_team_neighbors = live_neighbors - red_team_neighbors // treats white as blue
            // actually don't need to track blue_team_neighbors because we look up from red_team_neighbors
            if (RED_TEAM_BLUE_TEAM_LOOKUP[grid[y][x]]) {
                new_grid[y][x] = RED_TEAM_BLUE_TEAM_LOOKUP[grid[y][x]][live_neighbors][red_team_neighbors]
            } else {
                success = false
                console.error(`apply_rules() error: unknown cell state ${grid[y][x]}`)
            }
        }
    }
    return success
} // end apply_rules()
