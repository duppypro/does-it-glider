////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  conway
//      grid
////////////////////////////////////////////////////////////////////////////////

const log = console.log
const err = console.error
const min = Math.min
const max = Math.max
//TODO LOW PRI: add a debug mode that logs to a textarea instead of console
//TODO import these shorthands from a shared module
// INPUT a d3 selection
//     adds a graph paper pattern to it
//     makes it zoom+pan in response to mouse and touch events
// RETURN a d3 selection of the field that other gol functions can use    
export const append_grid = (app, cell_px = 20, w = 12, h = false,) => {
    if (!app || app.empty()) {
        return d3.select(null)
    }
    if (!h) h = w
    // w, h in units of life cells
    // all other dimensions in units of px
    const G_WIDTH = cell_px * w
    const G_HEIGHT = cell_px * h
    const app_w = app.node().clientWidth
    const app_h = app.node().clientHeight
    const G_PAD_LEFT = (G_WIDTH - app_w) / 2
    const G_PAD_TOP = (G_HEIGHT - app_h) / 2
    const cx = app_w / 2
    const cy = app_h / 2

    // Create the SVG
    const svg = app.insert('svg', 'span.touch-target') // insert before the touch target so it renders underneath
        .attr('width', `${app_w}px`)
        .attr('height', `${app_h}px`)
    // need this g element so we can transform it
    // and leave the svg container static
    // Create a g element inside the svg    
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
    // TODO low priority: make the grid lines stroke-width responsive to zoom scale
    // scaling the stroke width on the zoom event change of transform is something
    // that I think I can do it with D3.js but not CSS
    pattern.append('path').attr('class', 'pattern-line')
    .attr('d', `M ${cell_px},0 L 0,0 0,${cell_px}`); // draw top and left edges of each cell

    g.append('rect').classed('grid-background', true)
    .attr('width', `${G_WIDTH}px`)
    .attr('height', `${G_HEIGHT}px`)
    
    g.append('rect').classed('grid-fill', true) // CSS will fill this with #grid-pattern
    .attr('width', `${G_WIDTH}px`)
    .attr('height', `${G_HEIGHT}px`)
    .style('fill', 'url(#grid-pattern)')
    
    // hook the drag and zoom events to the svg
    // it's important that the transform is relative to the svg
    // then applied to the g element different from the svg
    // https://www.d3indepth.com/zoom-and-pan/#:~:text=It%27s%20helpful%20to%20distinguish%20between%20the%20HTML%20or%20SVG%20element%20that%20receives%20the%20zoom%20and%20pan%20gestures%20and%20the%20elements%20that%20get%20zoomed%20and%20panned%20(the%20elements%20that%20get%20transformed).%20It%27s%20important%20that%20these%20elements%20are%20different%2C%20otherwise%20the%20panning%20won%27t%20work%20properly.
    // DONE figure out how to use .extent() or .translateExtent() properly
    // DONE DONE I was wrong. .translateExtent() is the right way to do this
    // More appreciation for how clever Michael Bostock is and the usefulness of D3js
    function apply_drag_zoom({ transform }) {
        // use svg zoom and drag units to transform the g element
        transform = transform.translate(-G_PAD_LEFT, -G_PAD_TOP) // adjust for starting offset
        // FIXED: Keep off-grid area from coming too far into the screen
        g.attr('transform', transform)
    }
        
    svg.call(
        d3.zoom()
            .scaleExtent([1 / 8, 4])
            .translateExtent([
                [-G_PAD_LEFT - cx/4, -G_PAD_TOP - cy/4],
                [app_w + G_PAD_LEFT + cx/4, app_h + G_PAD_TOP + cy/4],
            ])
            .on('zoom', apply_drag_zoom)
            .on('end',
                ({ transform }) => {
                    log('end drag+zoom', transform.toString())
                }
            )
    )
    
    return g
} // end grid()
        