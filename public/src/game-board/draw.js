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
 * @param {Object[]} live_cells - Array of live cells {x, y, state}.
 * @param {number} cell_px - Size of each cell in pixels.
 * @param {number} opacity - Current fade-in opacity.
 */
export function draw(g, live_cells, cell_px, opacity = 1) {
    const data = live_cells.map(cell => ({
        id: `${cell.x}-${cell.y}`,
        x: cell.x,
        y: cell.y,
        css_class: COLOR_TO_CLASS[cell.state]
    }))

    // 2. D3 Data Join
    const cells = g.selectAll('rect.cell')
        .data(data, d => d.id)

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
