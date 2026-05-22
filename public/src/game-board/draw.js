////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, 2025 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider
//      draw
////////////////////////////////////////////////////////////////////////////////

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"

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

const PARTY_GLIDER_CLASS = 'party-glider'

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
        css_class: cell.glider_id ? PARTY_GLIDER_CLASS : COLOR_TO_CLASS[cell.state],
        glider_id: cell.glider_id
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
        .style('opacity', opacity)
        .attr('x', d => `${d.x * cell_px}px`)
        .attr('y', d => `${d.y * cell_px}px`)
        .each(function(d) {
            const el = d3.select(this)
            const new_class = `cell ${d.css_class}`
            
            // Log for debugging if needed (remove after verification)
            // console.log(`Cell ${d.x},${d.y} glider_id: ${d.glider_id} class: ${new_class}`);

            // Only update class if it changed to avoid restarting animations
            if (this.getAttribute('class') !== new_class) {
                el.attr('class', new_class)
            }
            
            if (d.glider_id) {
                // Set a fixed delay based on the glider ID so it stays in its 
                // own part of the rainbow cycle without restarting every frame.
                const new_delay = `${-(d.glider_id * 0.1) % 2}s`
                if (this.style.animationDelay !== new_delay) {
                    el.style('animation-delay', new_delay)
                }
            } else {
                if (this.style.animationDelay) {
                    el.style('animation-delay', null)
                }
            }
        })
}
