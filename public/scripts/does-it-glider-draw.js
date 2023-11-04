// does-it-glider-draw.js
// modify the DOM from a 2D array of Conway's Game of Life (gol_state)
export const draw = (g, state) => {
    // render/draw each live cell in state as a white rect in the svg
    // clear all of the old rects first
    let all = g.selectAll("rect.live_cell")
    all.remove()
    // loop over 2D array state
    for(let y = 0; y < state.length; y++) {
        for(let x = 0; x < state[0].length; x++) {
            // if the cell is alive
            // console.log(state[y][x])
            if (state[y][x] == '⬜') {
                // draw a white rect in the svg
                g.append("rect").classed("live_cell", true)
                    .attr("x", `${x * 20}px`)
                    .attr("y", `${y * 20}px`)
                    .attr("width", `${20}px`)
                    .attr("height", `${20}px`)
                    .attr("fill", "#ffffff")
            }
        }
    }
}
