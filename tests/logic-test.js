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
    
    if (resize_state.grid_width !== 128 || resize_state.grid_height !== 128) {
        throw new Error(`Expected initial grid dimensions to be 128x128, got ${resize_state.grid_width}x${resize_state.grid_height}`);
    }

    // Set a 2x2 block still-life touching the left boundary (0, 10)
    resize_state.live_cells = [
        { x: 0, y: 10, state: '⬜', gen_count: 0 },
        { x: 0, y: 11, state: '⬜', gen_count: 0 },
        { x: 1, y: 10, state: '⬜', gen_count: 0 },
        { x: 1, y: 11, state: '⬜', gen_count: 0 }
    ];
    resize_state.current_grid[10][0] = '⬜';
    resize_state.current_grid[11][0] = '⬜';
    resize_state.current_grid[10][1] = '⬜';
    resize_state.current_grid[11][1] = '⬜';

    // Enable ticking by resetting pause countdown
    resize_state.new_pause_countdown = 0;
    
    // Simulating next tick should trigger boundary check and expand symmetrically
    resize_state.tick(settings.MSEC_PER_GEN);

    if (resize_state.grid_width !== 256 || resize_state.grid_height !== 256) {
        throw new Error(`Expected grid to expand symmetrically to 256x256, got ${resize_state.grid_width}x${resize_state.grid_height}`);
    }

    // The cell originally at (0, 10) should have shifted by +64 to (64, 74)
    const shifted_cell = resize_state.live_cells.find(c => c.x === 64 && c.y === 74);
    if (!shifted_cell) {
        throw new Error(`Expected live cell at shifted coordinate (64, 74) but it was not found. Current cells: ${JSON.stringify(resize_state.live_cells)}`);
    }
    console.log("PASSED: Grid expanded symmetrically to 256x256 and coordinates shifted by +64.");

    console.log("Testing grid reset on loading new seed...");
    resize_state.load_new_seed(seeds.glider);
    if (resize_state.grid_width !== 128 || resize_state.grid_height !== 128) {
        throw new Error(`Expected grid size to reset to 128x128 on seed load, got ${resize_state.grid_width}x${resize_state.grid_height}`);
    }
    console.log("PASSED: Grid successfully reset back to 128x128 on seed load.");

    console.log("Testing grid max size ceiling (1024x1024)...");
    const ceiling_state = new GameState(1024, 1024, settings);
    ceiling_state.live_cells = [{ x: 0, y: 10, state: '⬜', gen_count: 0 }];
    ceiling_state.current_grid[10][0] = '⬜';
    ceiling_state.new_pause_countdown = 0;
    ceiling_state.tick(settings.MSEC_PER_GEN);
    
    if (ceiling_state.grid_width !== 1024 || ceiling_state.grid_height !== 1024) {
        throw new Error(`Expected grid size to stay at 1024x1024, but it expanded to ${ceiling_state.grid_width}x${ceiling_state.grid_height}`);
    }
    console.log("PASSED: Grid size ceiling of 1024x1024 enforced successfully.");
}

run_test().catch(err => {
    console.error(err);
    process.exit(1);
});
