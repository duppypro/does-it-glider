//////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider
//      imports
//////////////////////////////////////////////////////////////////////

export { settings } from './settings.js'
export * as seeds from './seeds.js'

// Conway's Game of Life modules
export {
    apply_rules as apply_rules_old_new,
    add_seed,
    clear_grid,
} from '../conway/play.js'

// game-board modules
export {
    append_grid,
    zoom_grid,
} from '../game-board/grid.js'
export { draw } from '../game-board/draw.js'
