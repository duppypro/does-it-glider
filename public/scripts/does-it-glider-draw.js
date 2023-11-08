// does-it-glider-draw.js
// modify the DOM from a 2D array of Conway's Game of Life (gol_state)
export const draw = (g, state) => {
    // render/draw each live cell in state as a white rect in the svg
    // clear all of the old rects first
    let all = g.selectAll('rect.cell')
    all.remove()
    // loop over 2D array state
    const COLOR_TO_CLASS = {
        'o': false,
        'b': 'live-cell',
        'R': 'red-team-cell',
        'B': 'blue-team-cell',
    }
    for(let y = 0; y < state.length; y++) {
        for(let x = 0; x < state[0].length; x++) {
            if (COLOR_TO_CLASS[state[y][x]]) {
                // draw a white rect in the svg
                g.append('rect')
                    .classed('cell', true)
                    .classed(COLOR_TO_CLASS[state[y][x]], true)
                    .attr('x', `${x * 20}px`)
                    .attr('y', `${y * 20}px`)
                    .attr('width', `${20}px`)
                    .attr('height', `${20}px`)
            }
        }
    }
}
