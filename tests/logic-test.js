//////////////////////////////////////////////////////////////////////
//  (c) 2023-2026 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider
//      headless-test
//////////////////////////////////////////////////////////////////////

import { GameState } from '../public/src/does-it-glider/game-state.js';
import { settings } from '../public/src/does-it-glider/settings.js';
import * as seeds from '../public/src/does-it-glider/seeds.js';

// Mocking the 'dig' import for GameState since it relies on browser/D3 stuff 
// In a real setup, we'd use a test double or JSDOM.
// For now, let's just test if GameState initializes and ticks.

async function run_test() {
    console.log("Starting Headless GameState Test...");
    
    const state = new GameState(10, 10, settings);
    
    console.log("Initial Gen Count:", state.gen_count);
    if (state.gen_count !== 0) throw new Error("Gen count should be 0");

    state.load_new_seed(seeds.glider);
    console.log("Seed Loaded. Generation Count:", state.gen_count);

    // Force countdown to 0 to allow ticking
    state.new_pause_countdown = 0;
    
    // Simulate one generation
    state.tick(settings.MSEC_PER_GEN);
    
    console.log("Gen Count after 1 tick:", state.gen_count);
    
    if (state.gen_count === 1) {
        console.log("PASSED: GameState logic is functional.");
    } else {
        console.error("FAILED: Gen count did not increment.");
        process.exit(1);
    }

    console.log("Testing speed multiplier logic...");
    if (state.speed_multiplier !== 1.0) throw new Error("Speed multiplier should default to 1.0");

    state.set_speed_multiplier(2.0);
    if (state.speed_multiplier !== 2.0) throw new Error("Speed multiplier did not update to 2.0");
    if (state.msec_per_gen !== settings.MSEC_PER_GEN / 2.0) {
        throw new Error("msec_per_gen did not scale correctly at 2x");
    }

    state.set_speed_multiplier(0.5);
    if (state.speed_multiplier !== 0.5) throw new Error("Speed multiplier did not update to 0.5");
    if (state.msec_per_gen !== settings.MSEC_PER_GEN / 0.5) {
        throw new Error("msec_per_gen did not scale correctly at 0.5x");
    }

    console.log("Testing speed multiplier reset on seed load...");
    state.load_new_seed(seeds.glider);
    if (state.speed_multiplier !== 1.0) {
        throw new Error("Speed multiplier did not reset to 1.0 on new seed load");
    }
    if (state.msec_per_gen !== settings.MSEC_PER_GEN) {
        throw new Error("msec_per_gen did not reset to settings.MSEC_PER_GEN on new seed load");
    }
    console.log("PASSED: Speed multiplier logic is fully functional and correct.");

    console.log("Testing dynamic grid sizing...");
    const resize_state = new GameState(128, 128, settings);
    
    if (resize_state.vis_width !== 128 || resize_state.vis_height !== 128) {
        throw new Error(`Expected initial visual dimensions to be 128x128, got ${resize_state.vis_width}x${resize_state.vis_height}`);
    }

    // Set a 2x2 block still-life breaching the left visual boundary (vis_left = 960, so we place at 959)
    const bx = resize_state.vis_left - 1;
    resize_state.live_cells = [
        { x: bx, y: 1000, state: '⬜', gen_count: 0 },
        { x: bx, y: 1001, state: '⬜', gen_count: 0 },
        { x: bx + 1, y: 1000, state: '⬜', gen_count: 0 },
        { x: bx + 1, y: 1001, state: '⬜', gen_count: 0 }
    ];
    resize_state.current_grid[1000][bx] = '⬜';
    resize_state.current_grid[1001][bx] = '⬜';
    resize_state.current_grid[1000][bx + 1] = '⬜';
    resize_state.current_grid[1001][bx + 1] = '⬜';

    // Enable ticking by resetting pause countdown
    resize_state.new_pause_countdown = 0;
    
    // Simulating next tick should trigger boundary check and expand symmetrically
    resize_state.tick(settings.MSEC_PER_GEN);

    if (resize_state.vis_width !== 256 || resize_state.vis_height !== 256) {
        throw new Error(`Expected visual grid to expand symmetrically to 256x256, got ${resize_state.vis_width}x${resize_state.vis_height}`);
    }

    // Coordinates do NOT shift under the decoupled 2048 strategy!
    const unshifted_cell = resize_state.live_cells.find(c => c.x === bx && c.y === 1000);
    if (!unshifted_cell) {
        throw new Error(`Expected live cell at unshifted coordinate (${bx}, 1000) but it was not found.`);
    }
    console.log("PASSED: Visual grid expanded symmetrically to 256x256 and coordinates remained unshifted.");

    console.log("Testing grid reset on loading new seed...");
    resize_state.load_new_seed(seeds.glider);
    if (resize_state.vis_width !== 128 || resize_state.vis_height !== 128) {
        throw new Error(`Expected visual grid size to reset to 128x128 on seed load, got ${resize_state.vis_width}x${resize_state.vis_height}`);
    }
    console.log("PASSED: Visual grid successfully reset back to 128x128 on seed load.");

    console.log("Testing static 2048x2048 algorithmic grid...");
    const ceiling_state = new GameState(128, 128, settings);
    if (ceiling_state.grid_width !== 2048 || ceiling_state.grid_height !== 2048) {
        throw new Error(`Expected static 2048x2048 grid, got ${ceiling_state.grid_width}x${ceiling_state.grid_height}`);
    }
    console.log("PASSED: Static 2048x2048 algorithmic grid verified.");

    console.log("Testing glider escape evaporation near absolute 2048 boundary...");
    const escape_state = new GameState(128, 128, settings);
    // Seed a valid mature glider touching the absolute border (x=1, y=1)
    escape_state.active_gliders = [{
        id: 42,
        x: 1,
        y: 1,
        phase: 0,
        orientation_idx: 0,
        age: 5,
        is_mature: true,
        cells: [{ x: 2, y: 1 }, { x: 3, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }]
    }];
    escape_state.live_cells = [
        { x: 2, y: 1, state: '⬜', gen_count: 0 },
        { x: 3, y: 2, state: '⬜', gen_count: 0 },
        { x: 1, y: 3, state: '⬜', gen_count: 0 },
        { x: 2, y: 3, state: '⬜', gen_count: 0 },
        { x: 3, y: 3, state: '⬜', gen_count: 0 }
    ];
    escape_state.current_grid[1][2] = '⬜';
    escape_state.current_grid[2][3] = '⬜';
    escape_state.current_grid[3][1] = '⬜';
    escape_state.current_grid[3][2] = '⬜';
    escape_state.current_grid[3][3] = '⬜';
    
    // Call _detect_gliders to evaluate and evaporate this boundary glider
    escape_state._detect_gliders();
    
    if (escape_state.live_cells.length !== 0) {
        throw new Error(`Expected live_cells to be empty after glider evaporated, but had ${escape_state.live_cells.length}`);
    }
    console.log("PASSED: Glider cleanly escaped and evaporated.");
}

run_test().catch(err => {
    console.error(err);
    process.exit(1);
});
