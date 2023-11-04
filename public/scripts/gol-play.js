// gol-play.js - play Conway's Game of Life

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
            if (start[y][x] == '⬜') {
                console.log(`set_state: ${wrap_y}, ${wrap_x}`)
            }
        }
    }
}

// apply_rules
// INPUT a 2D array of the old state
//     run Conway's Game of Life rules on it
//     makes it zoom+pan in response to mouse and touch events
// RETURN a 2D array of the new state    
export const apply_rules = (state) => {
    // Cpway's Game of Life rules are:
    // 1. Any live cell with two or three live neighbours survives.
    // 2. Any dead cell with three live neighbours becomes a live cell.
    // 3. All other live cells die in the next generation. Similarly, all other dead cells stay dead.
    // RULES_LOOKUP is a lookup table for the rules
    const RULES_LOOKUP = {
        '⬜': ['⬛', '⬛', '⬜', '⬜', '⬛', '⬛', '⬛', '⬛', '⬛'],
        '⬛': ['⬛', '⬛', '⬛', '⬜', '⬛', '⬛', '⬛', '⬛', '⬛']
    }
    const height = state.length;
    const width = state[0].length;
    // make a new_state the size as state and fill it with dead cells
    let new_state = Array.from({length: height}, () => Array.from({length: width}, () => '⬛'))
    // loop over 2D array state
    // and apply the rules to each cell
    for(let y = 0; y < height; y++) {
        for(let x = 0; x < width; x++) {
            // count the number of neighbors that are alive
            let alive_neighbors = 0
            // loop over the 3x3 grid around the cell
            for(let ny = y-1; ny <= y+1; ny++) {
                for(let nx = x-1; nx <= x+1; nx++) {
                    // ignore the cell itself
                    if (nx == x && ny == y) continue
                    // wrap around the edges of the state
                    let wrapped_nx = (nx + width) % width
                    let wrapped_ny = (ny + height) % height
                    // count the alive neighbors
                    if (state[wrapped_ny][wrapped_nx] == '⬜') {
                        alive_neighbors += 1
                    }
                }
            }
            new_state[y][x] = RULES_LOOKUP[state[y][x]][alive_neighbors]
        }
    }
    return new_state
}
