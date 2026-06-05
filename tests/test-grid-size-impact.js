//////////////////////////////////////////////////////////////////////
//  (c) 2026 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider
//      test-grid-size-impact
//////////////////////////////////////////////////////////////////////

import { GameState } from './game-state-legacy.js';
import { settings } from './settings-legacy.js';

async function test_grid_sizes() {
    console.log("=== Testing Wordle 1,811 Seed Lifespan on Different FIXED Grid Sizes ===");

    const comment_seed = [
        '⬛⬛⬛⬜⬛',
        '⬛⬜⬜⬛⬛',
        '⬜⬜⬛⬛⬛',
        '⬜⬜⬛⬛⬛',
        '⬜⬜⬜⬜⬜'
    ];

    const run_on_size = (width, height) => {
        const state = new GameState(width, height, settings);
        state.load_new_seed(comment_seed);
        state.new_pause_countdown = 0;
        
        // Ensure no dynamic sizing occurs
        state._check_and_expand_grid = function() {};
        state._detect_gliders = function() {};

        let ticks = 0;
        while (!state.is_stable && state.gen_count < 20000) {
            state.tick(settings.MSEC_PER_GEN, true);
            ticks++;
        }
        console.log(`- Grid Size ${width}x${height}: finished at Gen ${state.gen_count}, Is Stable: ${state.is_stable}`);
    };

    run_on_size(128, 128);
    run_on_size(255, 256);
    run_on_size(512, 512);
    run_on_size(1024, 1024);
}

test_grid_sizes().catch(err => {
    console.error(err);
    process.exit(1);
});
