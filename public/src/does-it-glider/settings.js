////////////////////////////////////////////////////////////////////////////////
// (c) 2023, David 'Duppy' Proctor, Interface Arts
//
// settings
//      global constants
//
////////////////////////////////////////////////////////////////////////////////
// XXX
export const settings = {
    // game of life configuration
    GRID_WIDTH: 256, // in cells
    GRID_HEIGHT: 256, // in cells
    WRAP_GRID: false,

    // shader source constants
    CELL_PX: 20,
    BORDER_PX: 1.5, // defined as inwards from the edge of the cell at CELL_PX

    // UI preferences
    BEAT: (60 * 1000) / 180.0,
    // Use BEAT for the speed of animations and life simulation
    // (60sec/ min * 1000msec/sec) / 120.0BPM -> msec/BEAT
}
