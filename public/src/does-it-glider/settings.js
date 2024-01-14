////////////////////////////////////////////////////////////////////////////////
// (c) 2023, David 'Duppy' Proctor, Interface Arts
//
// settings
//      global constants
//
////////////////////////////////////////////////////////////////////////////////

export const settings = {
    // game of life configuration
    // at least 1 pattern needs size 192x192, just barely fits.
    // Use an odd number of cells horizontally so that the 5x6 seed centers on the screen
    GRID_WIDTH: 255, // units of cells
    GRID_HEIGHT: 256, // units of cells

    // UI preferences
    CELL_PX: 8,
    BORDER_PX: 0.5, // defined as inwards from the edge of the cell at CELL_PX

    // Use BEAT for the speed of animations
    // (60sec/ min * 1000msec/sec) / 120.0BPM -> msec/BEAT
    // ticks are display refresh frames
    // gens are conway life generations
    MSEC_PER_BEAT: 60.0 * 1000.0 / 90.0, // 60000.0msec/min / beat/min-> units of msec/BEAT
    MSEC_PER_GEN: 1000.0 / 24.0, // 1000.0msec/sec / Ngen/sec -> units of msec/gen
    NEW_PAUSE_MSEC: 1.667 * 1000.0,
}
