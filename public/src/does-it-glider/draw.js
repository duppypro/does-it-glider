////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  does it glider
//      draw
////////////////////////////////////////////////////////////////////////////////

let draw_count = 0, sum_total = 0, sum_remove = 0
let min = Infinity, max = 0
let total = 0, time = 0

const COLOR_TO_CLASS = {
    '⬛': false,
    'o': false,
    '.': false,
    '⬜':'⬜',
    'b': '⬜',
    'X': '⬜',
    '🟥':'🟥',
    'R': '🟥',
    '🟦':'🟦',
    'B': '🟦',
}
// modify the DOM from a 2D array of Conway's Game of Life (gol_state)
export const draw = (g, state, cell_px) => { // HACK - do better than passing cell_px down, add some class 
    const startTime = performance.now()
    
    // render/draw each live cell in state as a white rect in the svg
    // clear all of the old rects first
    const all = g.selectAll('rect.cell')
    all.remove()
    const removeTime = performance.now() - startTime
    // loop over 2D array state
    for(let y = 0; y < state.length; y++) {
        for(let x = 0; x < state[0].length; x++) {
            if (COLOR_TO_CLASS[state[y][x]]) {
                // draw a white rect in the svg
                g.insert('rect', '.grid-lines') // render this before/below grid-lines but after grid-background
                .classed('cell', true)
                .classed(COLOR_TO_CLASS[state[y][x]], true)
                .attr('x', `${x * cell_px}px`)
                .attr('y', `${y * cell_px}px`)
                .attr('width', `${cell_px}px`)
                .attr('height', `${cell_px}px`)
            }
        }
    }
    
    const draw_time = performance.now() - startTime
    if (draw_time > 33.33) {
        console.log(`draw time: ${draw_time.toFixed(3)}ms`)
    }
}

/*******************************************************************************
 *  Speed test results
 *  for y, for x, with g.insert and .attr('x', `${x * cell_px}px`)
 *  total: 5.03ms, remove: 0.52ms, min: 3.50ms, max: 12.40ms
 *  total: 5.28ms, remove: 0.52ms, min: 3.60ms, max: 19.00ms
 *  total: 5.44ms, remove: 0.60ms, min: 3.80ms, max: 23.20ms
 *  total: 5.98ms, remove: 0.78ms, min: 3.90ms, max: 22.20ms
 *  total: 7.71ms, remove: 1.25ms, min: 5.20ms, max: 31.20ms
 *  total: 7.05ms, remove: 1.14ms, min: 5.50ms, max: 15.90ms
 *  total: 7.92ms, remove: 1.31ms, min: 5.80ms, max: 27.30ms
 *  total: 6.39ms, remove: 0.91ms, min: 4.70ms, max: 21.90ms
 *  total: 7.43ms, remove: 1.22ms, min: 5.70ms, max: 18.20ms
 *  total: 6.69ms, remove: 1.06ms, min: 4.90ms, max: 19.30ms
 *  
 *  next results making data in loop and d3 enter, update, exit pattern
 *******************************************************************************/
