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
export const grid = (app) => {
    // define configuration of the grid total size in cells and the individual cell size in pixels
    const GRID_SIZE = 300
    const CELL_SIZE = 20

    // Create the SVG
    const svg = app.insert('svg', 'span.touch-target') // insert before the touch target so it renders underneath
    // BUG: this depends on app already having a span.touch-target
        // .style('pointer-events', 'all')
        .attr('width', '400%')
        .attr('height', '400%')
        .style('position', 'absolute')
        .style('left', '-150%')
        .style('top', '-150%')

    // create a g element inside the svg    
    // need this g element so we can transform it
    // and leave the svg container static
    const g = svg.append('g')

    // Create the graph paper pattern
    const pattern = g.append('defs')
        .append('pattern')
        .attr('id', 'grid-pattern')
        .attr('class', 'cell dead')
        .attr('width', '20px')
        .attr('height', '20px')
        .attr('patternUnits', 'userSpaceOnUse') // this makes the pattern scale with the svg zoom (according to Copilot)

    // pattern.append('path')
    //     .attr('class', 'cell-highlight')
    //     .attr('d', 'M 15,0 L 5,0 0,5 0,15') // draw left and top edges of each cell

    pattern.append('path').attr('class', 'cell-shadow')
        .attr('d', 'M 15,0 L 20,5 20,15 15,20 5,20 0,15'); // draw right and bottom edges of each cell

    g.append('rect').classed('grid-background', true)
        .attr('width', '100%')
        .attr('height', '100%')

    g.append('rect').classed('grid-lines', true)
        .attr('width', '100%')
        .attr('height', '100%')

    function zoomed({ transform }) {
        // use svg zoom and drag units to transform the g element
        // avoid the common bug of applying the transform to the svg
        g.attr('transform', transform)
    }

    // hook the drag and zoom events to the svg
    // it's important that the transform is relative to the svg
    // then applied to the g element
    // TODO: figure out how to use .extent() or .translateExtent() properly
    svg.call(d3.zoom()
        .scaleExtent([.25, 2]) // 1/4 zoom limit because default size is 400%
        .on('zoom', zoomed)
    )

    return g
} // end grid()
