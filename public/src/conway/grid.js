////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  conway
//      grid
////////////////////////////////////////////////////////////////////////////////

// INPUT a d3 selection
//     adds a graph paper pattern to it
//     makes it zoom+pan in response to mouse and touch events
// RETURN a d3 selection of the field that other gol functions can use    
export const new_grid = (app, cell_px = 20, w = 12, h = false,) => {
    if (!app || app.empty()) {
        return d3.select(null)
    }
    if (!h) h = w
    const G_WIDTH = cell_px * w
    const G_HEIGHT = cell_px * h
    const p_w = app.node().clientWidth
    const p_h = app.node().clientHeight
    const G_PAD_LEFT = (G_WIDTH - p_w) / 2
    const G_PAD_TOP = (G_HEIGHT - p_h) / 2
    // Create the SVG
    const svg = app.insert('svg', 'span.touch-target') // insert before the touch target so it renders underneath
        .attr('width', `${p_w}px`)
        .attr('height', `${p_h}px`)
    // create a g element inside the svg    
    // need this g element so we can transform it
    // and leave the svg container static
    const g = svg.append('g')
        .attr('width', `100%`)
        .attr('height', `100%`)
        .attr('transform', `translate(${-G_PAD_LEFT}, ${-G_PAD_TOP})`)

    // Create the graph paper pattern
    const pattern = g.append('defs')
        .append('pattern')
        .attr('id', 'grid-pattern') // WARN this ID name must match the url(CSS selector) used in the grid-fill class
        .attr('class', 'cell dead')
        .attr('width', `${cell_px}px`)
        .attr('height', `${cell_px}px`)
        .attr('patternUnits', 'userSpaceOnUse')

    // color the background of the entire parttern
    pattern.append('rect').attr('class', 'pattern-background')
        .attr('width', `${cell_px}px`)
        .attr('height', `${cell_px}px`)
    // add the grid lines
    pattern.append('path').attr('class', 'pattern-line')
        .attr('d', `M ${cell_px},0 L 0,0 0,${cell_px}`); // draw top and left edges of each cell

    g.append('rect').classed('grid-background', true)
        .attr('width', `${G_WIDTH}px`)
        .attr('height', `${G_HEIGHT}px`)

    g.append('rect').classed('grid-fill', true) // CSS will fill this with #grid-pattern
        .attr('width', `${G_WIDTH}px`)
        .attr('height', `${G_HEIGHT}px`)
        .style('fill', 'url(#grid-pattern)')

    function zoomed({ transform }) {
        // use svg zoom and drag units to transform the g element
        // avoid the common bug of applying the transform to the svg
        transform = transform.translate(-G_PAD_LEFT, -G_PAD_TOP) // adjust for starting offset
        g.attr('transform', transform)
    }

    // hook the drag and zoom events to the svg
    // it's important that the transform is relative to the svg
    // then applied to the g element
    // TODO figure out how to use .extent() or .translateExtent() properly
    svg.call(d3.zoom()
        .scaleExtent([1/cell_px, 4]) // 1/4 zoom limit because default size is 400%
        .on('zoom', zoomed)
    )

    return g
} // end grid()
