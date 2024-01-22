////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, David 'Duppy' Proctor, Interface Arts
//
//  does it glider
//      draw
////////////////////////////////////////////////////////////////////////////////

const COLOR_TO_CLASS = {
    '⬛': false,
    'o': false,
    '.': false,
    '⬜': '⬜',
    'b': '⬜',
    'X': '⬜',
    '🟥': '🟥',
    'R': '🟥',
    '🟦': '🟦',
    'B': '🟦',
}
// modify the DOM from a 2D array of Conway's Game of Life (gol_state)
export const draw = (g, state, cell_px, opacity = 1) => { // HACK - do better than passing cell_px down, add some class 
    // render/draw each live cell in state as a white rect in the svg
    // clear all of the old rects first
    const all = g.selectAll('rect.cell')
    all.remove()
    // loop over 2D array state
    for (let y = 0; y < state.length; y++) {
        for (let x = 0; x < state[0].length; x++) {
            if (COLOR_TO_CLASS[state[y][x]]) {
                // draw a white rect in the svg
                g.insert('rect', '.grid-lines') // render this before/below grid-lines but after grid-background
                    .classed('cell', true)
                    .classed(COLOR_TO_CLASS[state[y][x]], true)
                    .style('opacity', opacity)
                    .attr('x', `${x * cell_px}px`)
                    .attr('y', `${y * cell_px}px`)
                    .attr('width', `${cell_px}px`)
                    .attr('height', `${cell_px}px`)
            }
        }
    }

}
