////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, David 'Duppy' Proctor, Interface Arts
//
//  conway
//      grid
////////////////////////////////////////////////////////////////////////////////

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { settings } from '../does-it-glider/settings.js'

const log = console.log
const err = console.error
const min = Math.min
const max = Math.max
const round = Math.round
const clip = (val, smallest = 1, largest = 100) => min(max(smallest, val), largest)
//TODO LOW PRI: add a debug mode that logs to a textarea instead of console
//TODO import these shorthands from a shared module

let G_WIDTH
let G_HEIGHT
let app_w
let app_h
let G_PAD_LEFT
let G_PAD_TOP
let cx
let cy
let svg = d3.select(null)
let grid = d3.select(null)
let zoom = d3.zoom()
// INPUT a d3 selection
//     adds an svg with grid lines
//     attaches a drag and zoom event handler
//     centers the grid in the app element with overflow hidden
//     returns a d3 selection of the grid
// RETURN a d3 selection of the field that other gol functions can use    
export const append_grid = (app, cell_px = 20, w = 12, h = false,) => {
    // check inputs
    if (!app || app.empty()) {
        return d3.select(null)
    }
    if (!h) h = w // if h is not specified, make it square
    cell_px = clip(cell_px, 1, 256)
    w = clip(w, 1, 1024)
    h = clip(h, 1, 1024)

    // w, h are in units of cells
    // all other dimensions in units of px
    G_WIDTH = cell_px * w
    G_HEIGHT = cell_px * h
    app_w = app.node().clientWidth
    app_h = app.node().clientHeight
    G_PAD_LEFT = (G_WIDTH - app_w) / 2
    G_PAD_TOP = (G_HEIGHT - app_h) / 2
    cx = app_w / 2
    cy = app_h / 2

    // Create the SVG
    svg = app.insert('svg', 'span.touch-target') // insert before the touch target so it renders underneath
        .attr('width', `${app_w}px`)
        .attr('height', `${app_h}px`)
    // need this g element so we can transform it
    // and leave the svg container static
    // Create a g element inside the svg    
    grid = svg.append('g')
        .attr('width', `100%`)
        .attr('height', `100%`)
        .attr('transform', `translate(${-G_PAD_LEFT}, ${-G_PAD_TOP})`)

    // Create the graph paper pattern
    const pattern = grid.append('defs')
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

    grid.append('rect').classed('grid-background', true)
        .attr('width', `${G_WIDTH}px`)
        .attr('height', `${G_HEIGHT}px`)

    grid.append('rect').classed('grid-fill', true) // CSS will fill this with #grid-pattern
        .attr('width', `${G_WIDTH}px`)
        .attr('height', `${G_HEIGHT}px`)
        .style('fill', 'url(#grid-pattern)')

    // hook the drag and zoom events to the svg
    // it's important that the transform is relative to the svg
    // then applied to the g element different from the svg
    // https://www.d3indepth.com/zoom-and-pan/#:~:text=It%27s%20helpful%20to%20distinguish%20between%20the%20HTML%20or%20SVG%20element%20that%20receives%20the%20zoom%20and%20pan%20gestures%20and%20the%20elements%20that%20get%20zoomed%20and%20panned%20(the%20elements%20that%20get%20transformed).%20It%27s%20important%20that%20these%20elements%20are%20different%2C%20otherwise%20the%20panning%20won%27t%20work%20properly.
    // DONE figure out how to use .extent() or .translateExtent() properly
    // More appreciation for how clever Michael Bostock is and the usefulness of D3js
    function apply_drag_zoom(event) {
        // use svg zoom and drag units to transform the g element
        let transform
        transform = !isNaN(event.transform.x) ? event.transform : d3.zoomIdentity
        transform = transform.translate(-G_PAD_LEFT, -G_PAD_TOP) // adjust for starting offset
        grid.attr('transform', transform)
    }

    zoom = d3.zoom()
        .scaleExtent([2 / 8, 64 / 8]) // #BUG this 8 should be cell_px
        .translateExtent([ // Prevent grid from panning completely off screen
            [-G_PAD_LEFT - cx / 4, -G_PAD_TOP - cy / 4],
            [app_w + G_PAD_LEFT + cx / 4, app_h + G_PAD_TOP + cy / 4],
        ])
        .on('zoom', apply_drag_zoom)

    grid
        .on('pointerdown', (event) => { event.preventDefault() })

    svg.call(zoom)
    // Set the initial transform
    // TODO avoid applying a translation on every apply_drag_zoom()
    // the line below didn't work as expected.
    // zoom.transform(svg, d3.zoomIdentity.translate(-G_PAD_LEFT, -G_PAD_TOP))

    return grid
} // end append_grid()

export const zoom_grid = (x, y, k) => {
    let tx = d3.zoomIdentity.translate(x, y).scale(k)
    grid.transition()
        .duration(settings.NEW_PAUSE_MSEC)
        .ease(d3.easePolyIn.exponent(3))
        .attr('transform', tx.translate(-G_PAD_LEFT, -G_PAD_TOP))
        .on('end', () => { zoom.transform(svg, tx) })
}