////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  conway
//      play
////////////////////////////////////////////////////////////////////////////////

// play Conway's Game of Life

// set_state
// INPUT a 2D array for start and 2D array for destination
//    copy start array to the center of the destination array
// RETURN nothing, modifies destination array
export const set_state = (start, dest) => {
    // set width and height to the size of the dest array
    const height = dest.length
    const width = dest[0].length
    // copy the state into the center of the new_state
    // NOTE: wraps around in case the state is smaller than the new_state
    // loop over 2D array state wrapping around if needed
    // and copy it into the center of new_state
    for(let y = 0; y < start.length; y++) {
        for(let x = 0; x < start[0].length; x++) {
            let wrap_y = (y + Math.round((height - start.length) / 2) + height) % height
            let wrap_x = (x + Math.round((width - start[0].length) / 2) + width) % width
            dest[wrap_y][wrap_x] = start[y][x]
        }
    }
} // end set_state()

// apply_rules
// INPUT a 2D array of the old state
//     run Conway's Game of Life rules on it
//     makes it zoom+pan in response to mouse and touch events
// RETURN a 2D array of the new state    
export const apply_rules = (state) => {
    // Conway's Game of Life rules are:
    // 1. Any live cell with two or three live neighbours survives.
    // 2. Any dead cell with three live neighbours becomes a live cell.
    // 3. All other live cells die in the next generation. Similarly, all other dead cells stay dead.
    // RULES_LOOKUP is a lookup table for the rules
    // try red team 🟥 blue team 🟦 fight idea
    const RULES_LOOKUP = {
        'b': ['o', 'o', 'b', 'b', 'o', 'o', 'o', 'o', 'o'],
        'o': ['o', 'o', 'o', 'b', 'o', 'o', 'o', 'o', 'o'],
    }
    const RED_TEAM_BLUE_TEAM_LOOKUP = {
        'R': [ // if new live cell then there were either 2 or 3 neighbors
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
        'B': [ // if old cell blue then make live if 2 or 3 neighbors, set color to majority, old cell wins ties
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
        'o': [ // if old cell was dead then there were 3 neighbors. Arbitrarily decide to index by # of red neighbors
            [], // 0 neighbors, never uses this, placeholders to make index of 3 work
            [], // 1 neighbors, never uses this, placeholders to make index of 3 work
            [], // 2 neighbors, never uses this, placeholders to make index of 3 work
            ['B', 'B', 'R', 'R',], // with 3 neighbors, goes red if 2 or 3 red, only goes live if 2 or 3 blue (implies 0 or 1 red)
            [], // 4 neighbors, never uses this, placeholders to make index of 3 work
            [], // 5 neighbors, never uses this, placeholders to make index of 3 work
            [], // 6 neighbors, never uses this, placeholders to make index of 3 work
            [], // 7 neighbors, never uses this, placeholders to make index of 3 work
            [], // 8 neighbors, never uses this, placeholders to make index of 3 work
        ],
    }
    // if a white sneaks in do the same thing as if it is blue
    RED_TEAM_BLUE_TEAM_LOOKUP['b'] = RED_TEAM_BLUE_TEAM_LOOKUP['B']
    // get the height and width of the state
    const height = state.length;
    const width = state[0].length;
    // make a new_state the size as state and fill it with dead cells
    const new_state = Array.from({length: height}, () => Array.from({length: width}, () => 'o'))
    // loop over 2D array state
    // and apply the rules to each cell
    for(let y = 0; y < height; y++) {
        for(let x = 0; x < width; x++) {
            // count the number of neighbors that are alive
            let live_neighbors = 0
            let red_team_neighbors = 0
            let blue_team_neighbors = 0
            // loop over the 3x3 grid around the cell
            for(let ny = y-1; ny <= y+1; ny++) {
                for(let nx = x-1; nx <= x+1; nx++) {
                    // ignore the cell itself
                    if (nx == x && ny == y) continue
                    // wrap around the edges of the state
                    let wrapped_nx = (nx + width) % width
                    let wrapped_ny = (ny + height) % height
                    // count the alive neighbors
                    if (state[wrapped_ny][wrapped_nx] == 'b') {
                        live_neighbors += 1
                    }
                    if (state[wrapped_ny][wrapped_nx] == 'R') {
                        live_neighbors += 1
                        red_team_neighbors += 1
                    }
                    if (state[wrapped_ny][wrapped_nx] == 'B') {
                        live_neighbors += 1
                        // blue_team_neighbors += 1
                        // Don't count blue neighbors here because it can be computed from live_neighbors - red_team_neighbors
                        // and that method includes white as blue
                    }
                }
            }
            // blue_team_neighbors = live_neighbors - red_team_neighbors // treats white as blue
            // actually don't need to track blue_team_neighbors because we look up from red_team_neighbors
            // new_state[y][x] = RULES_LOOKUP[state[y][x]][live_neighbors]
            // if (state[y][x] != 'o') {
            //     console.log(`\r\nold:'${state[y][x]}' x,y:${x},${y}\r\n\tlive:${live_neighbors} red:${red_team_neighbors} blue:${blue_team_neighbors}\r\n\tnew:'${new_state[y][x]}'`)
            // }
            new_state[y][x] = RED_TEAM_BLUE_TEAM_LOOKUP[state[y][x]][live_neighbors][red_team_neighbors] || 'o'
        }
    }
    return new_state
} // end apply_rules()
