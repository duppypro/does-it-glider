////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, 2025 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider
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

/**
 * Renders the state using a Sparse DOM approach.
 * Only live cells are represented by DOM elements.
 * 
 * @param {d3.Selection} g - The D3 selection of the grid group.
 * @param {string[][]} state - 2D array of the current Game of Life state.
 * @param {number} cell_px - Size of each cell in pixels.
 * @param {number} opacity - Current fade-in opacity.
 */
export function draw(g, state, cell_px, opacity = 1) {
    const live_cells = []

    // 1. Extract sparse data: only live cells
    for (let y = 0; y < state.length; y++) {
        for (let x = 0; x < state[y].length; x++) {
            const cell_state = state[y][x]
            const css_class = COLOR_TO_CLASS[cell_state]
            if (css_class) {
                live_cells.push({
                    id: `${x}-${y}`, // Unique key for D3 data join
                    x,
                    y,
                    css_class
                })
            }
        }
    }

    // 2. D3 Data Join
    const cells = g.selectAll('rect.cell')
        .data(live_cells, d => d.id)

    // EXIT: Remove cells that are no longer live
    cells.exit().remove()

    // ENTER: Create new cells
    cells.enter().append('rect')
        .classed('cell', true)
        .attr('width', `${cell_px}px`)
        .attr('height', `${cell_px}px`)
        .merge(cells) // UPDATE + ENTER
        .attr('class', d => `cell ${d.css_class}`)
        .style('opacity', opacity)
        .attr('x', d => `${d.x * cell_px}px`)
        .attr('y', d => `${d.y * cell_px}px`)
}
