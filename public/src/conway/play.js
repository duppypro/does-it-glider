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
    const gh = grid.length, gw = grid[0].length
    const sh = seed.length, sw = seed[0].length
    // coordinates of corner of seed when seed is centered in grid
    const cx = Math.round((gw - sw) / 2), cy = Math.round((gh - sh) / 2)
    // loop over seed wrapping around if needed
    // and copy each cell into the center of grid
    for(let y = cy; y < cy+sh; y++) {
        for(let x = cx; x < cx+sw; x++) {
            // copy the seed into the grid, cropping if needed
            if (settings.WRAP_GRID) {
                // wrap around the edges of the grid
                grid[(y + gh) % gh][(x + gw) % gw] = seed[(y - cy + sh) % sh][(x - cx + sw) % sw]
            } else {
                // clip instead of wrap
                if (x >=0 && y >= 0 && x < gw && y < gh) {
                    grid[y][x] = seed[y - cy][x - cx]
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
    // 1. Any live cell with two or three live neighbours survives.
    // 2. Any dead cell with three live neighbours becomes a live cell.
    // 3. All other live cells die in the next generation. Similarly, all other dead cells stay dead.
    // RULES_LOOKUP is a lookup table for the rules
    // try red team 🟥 blue team 🟦 fight idea
    const CONWAY_RULES_LOOKUP = { // Original Conway's Game of Life rules
        'b': ['o', 'o', 'b', 'b', 'o', 'o', 'o', 'o', 'o'],
        'o': ['o', 'o', 'o', 'b', 'o', 'o', 'o', 'o', 'o'],
    }
    const RED_TEAM_BLUE_TEAM_LOOKUP = {
        'R': [
            [], // with 0 neighbors always return undefined which is interpreted as dead or '⬛'
            [], // with 1 neighbors always return undefiinterpreted as dead or '⬛'
            ['B', 'R', 'R',], // with 2 neighbors, stay red if 1 or 2 red, only goes blue if 2 blue (implies 0 red)
            ['B', 'R', 'R', 'R',], // with 3 neighbors, stay red if 1,2 or 3 red, only goes blue if 3 blue (implies 0 red)
            [], // with 4 neighbors always return undefined which is interpreted as dead or '⬛'
            [], // with 5 neighbors always return undefined which is interpreted as dead or '⬛'
            [], // with 6 neighbors always return undefined which is interpreted as dead or '⬛'
            [], // with 7 neighbors always return undefined which is interpreted as dead or '⬛'
            [], // with 8 neighbors always return undefined which is interpreted as dead or '⬛'
        ],
        'B': [
            [], // 0 neighbors always return undefiinterpreted as dead or '⬛'
            [], // 1 neighbors always return undefiinterpreted as dead or '⬛'
            ['B', 'B', 'R',], // 2 neighbors, stay blue if 1 or 2 blue, only goes red if 2 red (implies 0 blue)
            ['B', 'B', 'B', 'R',], // 3 neighbors, stay blue if 1,2 or 3 blue, only goes red if 3 red (implies 0 blue)
            [], // 4 neighbors always return undefined which is interpreted as dead or '⬛'
            [], // 5 neighbors always return undefined which is interpreted as dead or '⬛'
            [], // 6 neighbors always return undefined which is interpreted as dead or '⬛'
            [], // 7 neighbors always return undefined which is interpreted as dead or '⬛'
            [], // 8 neighbors always return undefined which is interpreted as dead or '⬛'
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
    const new_grid = Array.from({length: h}, () => Array.from({length: w}, () => 'o'))
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
