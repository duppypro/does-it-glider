// gol-field.js - Game of Life - field
// INPUT a d3 selection
//     adds a graph paper pattern to it
//     makes it zoom+pan in response to mouse and touch events
// RETURN a d3 selection of the field that other gol functions can use    

export const gol_field = (app) => {
    // Create the SVG
    const svg = app.append("svg")
        .style("pointer-events", "all")
    //make this element behind all others
        .style("z-index", "-1")
        .attr("width", "400%")
        .attr("height", "400%")
        .style("position", "absolute")
        .style("left", "-150%")
        .style("top", "-150%");

    // create a g element inside the svg    
    // need this g element so we can transform it
    // and leave the svg container static
    const g = svg.append("g");

    // Create the graph paper pattern
    const pattern = g.append("defs")
        .append("pattern")
        .attr("id", "grid")
        .attr("width", "20px")
        .attr("height", "20px")
        .attr("patternUnits", "userSpaceOnUse");

    pattern.append("path")
        .attr("fill", "none")
        .attr("d", "M 20 0 L 0 0 0 20")
        .attr("stroke-width", "0.5px")
        .attr("stroke", "#86888a");

    g.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "#212121");

    g.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "url(#grid)")
    
    function zoomed({transform}) {
        // use svg zoom and drag units to transform the g element
        g.attr("transform", transform)
    }

    // hook the drag and zoom events to the svg
    // it's important that the transform is relative to the svg
    // then applied to the g element
    // TODO: figureout how to use .extent() or .translateExtent() properly
    svg.call(d3.zoom()
        .scaleExtent([.25, 2]) // 1/4 zoom limit because default size is 400%
        .on("zoom", zoomed)
    )

    return g
}