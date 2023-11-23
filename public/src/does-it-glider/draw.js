////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  does it glider
//      draw
////////////////////////////////////////////////////////////////////////////////

let draw_count = 0

// modify the DOM from a 2D array of Conway's Game of Life (gol_state)
export const draw = (g, state) => {
    const startTime = performance.now()
    draw_count++

    // render/draw each live cell in state as a white rect in the svg
    // clear all of the old rects first
    let all = g.selectAll('rect.cell')
    all.remove()
    // loop over 2D array state
    const COLOR_TO_CLASS = {
        'o': false,
        'b': 'live',
        'R': 'red-team',
        'B': 'blue-team',
    }
    for(let y = 0; y < state.length; y++) {
        for(let x = 0; x < state[0].length; x++) {
            if (COLOR_TO_CLASS[state[y][x]]) {
                // draw a white rect in the svg
                g.insert('rect', '.grid-lines') // render this before/below grid-lines but after grid-background
                    .classed('cell', true)
                    .classed(COLOR_TO_CLASS[state[y][x]], true)
                    .attr('x', `${x * 20}px`)
                    .attr('y', `${y * 20}px`)
                    .attr('width', `${20}px`)
                    .attr('height', `${20}px`)
            }
        }
    }

    const endTime = performance.now()
    const elapsedTime = endTime - startTime
    if (elapsedTime > 20) {
        console.warn(`draw(${draw_count}) took ${elapsedTime}ms`)
    }
}
