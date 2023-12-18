////////////////////////////////////////////////////////////////////////////////
// (c) 2023, David 'Duppy' Proctor, Interface Arts
//
// settings
//      global constants
//
////////////////////////////////////////////////////////////////////////////////
// XXX

// LAST DEPLOY _beat = (60 * 1000) / 90.0 // BEATmsec = (60sec/ min * 1000msec/sec) / 120.0BPM
const _beat = (60 * 1000) / 120.0 //180.0 // BEATmsec = (60sec/ min * 1000msec/sec) / 120.0BPM
export const settings = {
    // game of life configuration
    // at least 1 pattern needs size 192x192, just barely fits.
    // Use an odd number of cells horizontally so that the 5x6 seed centers on the screen
    GRID_WIDTH: 255, // in cells
    GRID_HEIGHT: 256, // in cells

    // UI preferences
    CELL_PX: 16,
    BORDER_PX: 1, // defined as inwards from the edge of the cell at CELL_PX
    // Use BEAT for the speed of animations and life simulation
    // (60sec/ min * 1000msec/sec) / 120.0BPM -> msec/BEAT
    BEAT: _beat,
    // BEATmsec / (1000msec/60frame) ->  num_ticks has units of frames
    TICKS_PER_FRAME: Math.round((_beat / 6) / (1000 / 60)),
    // to pause for N seconds, set N sec * 60 frames/sec then round() so that mod (%) works
    PAUSE_FOR_NEW: Math.round(1.333 * 60),
    paste_animation: {
        PASTED: _beat,
        GUESSES: _beat,
        SEED: _beat,
    },
}
