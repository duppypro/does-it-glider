////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  conway
//      play
////////////////////////////////////////////////////////////////////////////////

import { settings } from '/src/does-it-glider/settings.js'

// play Conway's Game of Life

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

// apply_rules
// INPUT a 2D array of the old grid state
//     run Conway's Game of Life rules on it
// RETURN a 2D array of the new grid with the rules applied    
export const apply_rules = (grid) => {
    // Conway's Game of Life rules are:
    // 1. Dead cells with three live neighbours become a live cell.
    // 2. Dead cells with <3 or >3 neighbours stay dead.
    // 3. A live cell with 2 or 3 live neighbours stays alive.
    // 4. A live cell with <2 or >3 live neighbours dies.
    // '⬜' is a live cell, also 'b' or 'X'
    // '⬛' is a dead cell, also 'o' or '.'
    const CONWAY_RULES_LOOKUP = { // Original Conway's Game of Life rules
        'b': [ // rule lookup for live cells
            'o', // with 0 neighbors, dies
            'o', // with 1 neighbors, dies
            'b', // with 2 neighbors, stays alive
            'b', // with 3 neighbors, stays alive
            'o', // with 4 neighbors, dies
            'o', // with 5 neighbors, dies
            'o', // with 6 neighbors, dies
            'o', // with 7 neighbors, dies
            'o', // with 8 neighbors, dies
        ],
        'o': [ // rule lookup for dead cells
            'o', // with 0 neighbors, stays dead
            'o', // with 1 neighbors, stays dead
            'o', // with 2 neighbors, stays dead
            'b', // with 3 neighbors, becomes alive
            'o', // with 4 neighbors, stays dead
            'o', // with 5 neighbors, stays dead
            'o', // with 6 neighbors, stays dead
            'o', // with 7 neighbors, stays dead
            'o', // with 8 neighbors, stays dead
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
        'R': [
            [], // with 0 neighbors always return undefined which is dead or '⬛'
            [], // with 1 neighbors always return undefined which is dead or '⬛'
            ['B', 'R', 'R',], // with 2 neighbors, stay red if 1 or 2 red, only goes blue if 2 blue (implies 0 red)
            ['B', 'R', 'R', 'R',], // with 3 neighbors, stay red if 1,2 or 3 red, only goes blue if 3 blue (implies 0 red)
            [], // with 4 neighbors always return undefined which is dead or '⬛'
            [], // with 5 neighbors always return undefined which is dead or '⬛'
            [], // with 6 neighbors always return undefined which is dead or '⬛'
            [], // with 7 neighbors always return undefined which is dead or '⬛'
            [], // with 8 neighbors always return undefined which is dead or '⬛'
        ],
        'B': [ // all designed to use the same count of red neighbors as the last index
            [], // 0 neighbors always return undefined which is dead or '⬛'
            [], // 1 neighbors always return undefined which is dead or '⬛'
            ['B', 'B', 'R',], // 2 neighbors, stay blue if 1 or 2 blue, only goes red if 2 red (implies 0 blue)
            ['B', 'B', 'B', 'R',], // 3 neighbors, stay blue if 1,2 or 3 blue, only goes red if 3 red (implies 0 blue)
            [], // 4 neighbors always return undefined which is dead or '⬛'
            [], // 5 neighbors always return undefined which is dead or '⬛'
            [], // 6 neighbors always return undefined which is dead or '⬛'
            [], // 7 neighbors always return undefined which is dead or '⬛'
            [], // 8 neighbors always return undefined which is dead or '⬛'
        ],
        'o': [
            [], // 0 neighbors, never uses this, placeholders to make index of 3 work
            [], // 1 neighbors, never uses this, placeholders to make index of 3 work
            [], // 2 neighbors, never uses this, placeholders to make index of 3 work
            ['b', 'b', 'b', 'b',], // with 3 neighbors, goes live
            [], // 4 neighbors, never uses this, placeholders to make index of 3 work
            [], // 5 neighbors, never uses this, placeholders to make index of 3 work
            [], // 6 neighbors, never uses this, placeholders to make index of 3 work
            [], // 7 neighbors, never uses this, placeholders to make index of 3 work
            [], // 8 neighbors, never uses this, placeholders to make index of 3 work
        ],
        'b': [
            [], // 0 neighbors, never uses this, placeholders to make index of 3 work
            [], // 1 neighbors, never uses this, placeholders to make index of 3 work
            ['b', 'b', 'b',], // with 2 neighbors, stay live if 1 or 2 live
            ['b', 'b', 'b', 'b',], // with 3 neighbors, goes red if 2 or 3 red, only goes live if 2 or 3 blue (implies 0 or 1 red)
            [], // 4 neighbors, never uses this, placeholders to make index of 3 work
            [], // 5 neighbors, never uses this, placeholders to make index of 3 work
            [], // 6 neighbors, never uses this, placeholders to make index of 3 work
            [], // 7 neighbors, never uses this, placeholders to make index of 3 work
            [], // 8 neighbors, never uses this, placeholders to make index of 3 work
        ]
    }
    // get the height and width of the state
    const h = grid.length;
    const w = grid[0].length;
    // make a grid the size as state and fill it with dead cells
    const new_grid = Array.from({ length: h }, () => Array.from({ length: w }, () => 'o'))
    // BUG is new_grid causing the memory leak? is it better to modify grid in place?
    // loop over 2D array state
    // and apply the rules to each cell
    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            // count the number of neighbors that are alive
            let live_neighbors = 0
            let red_team_neighbors = 0
            // let blue_team_neighbors = 0 // don't need blue count because it can be computed from live_neighbors - red_team_neighbors
            // loop over the 3x3 grid around the cell
            let peek = 'o'
            for(let ny = y-1; ny <= y+1; ny++) {
                for(let nx = x-1; nx <= x+1; nx++) {
                    // ignore the cell itself
                    if (nx == x && ny == y) continue
                    if (settings.WRAP_GRID) {
                        // wrap around the edges of the grid
                        peek = grid[(ny + h) % h][(nx + w) % w]
                    } else {
                        // don't wrap
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
                            continue // this is same as peek = 'o', but slightly quicker
                        } else {
                            peek = grid[ny][nx]
                        }
                    }
                    // count the alive neighbors
                    if (peek == 'X') {
                        live_neighbors += 1
                    }
                    if (peek == 'b') {
                        live_neighbors += 1
                    }
                    if (peek == 'R') {
                        live_neighbors += 1
                        red_team_neighbors += 1
                    }
                    if (peek == 'B') {
                        live_neighbors += 1
                        // blue_team_neighbors += 1
                        // Don't count blue neighbors here because it can be computed from live_neighbors - red_team_neighbors
                        // and that method includes white as blue
                    }
                }
            }
            // blue_team_neighbors = live_neighbors - red_team_neighbors // treats white as blue
            // actually don't need to track blue_team_neighbors because we look up from red_team_neighbors
            // grid[y][x] = RULES_LOOKUP[state[y][x]][live_neighbors]
            new_grid[y][x] = RED_TEAM_BLUE_TEAM_LOOKUP[grid[y][x]][live_neighbors][red_team_neighbors] || 'o'
        }
    }
    return new_grid
} // end apply_rules()
