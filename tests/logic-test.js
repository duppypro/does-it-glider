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
}

run_test().catch(err => {
    console.error(err);
    process.exit(1);
});
