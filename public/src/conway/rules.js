    ////////////////////////////////////////////////////////////////////////////////
    //  (c) 2023, David 'Duppy' Proctor, Interface Arts
    //
    //  conway
    //      rules
    ////////////////////////////////////////////////////////////////////////////////
    
    // Conway's Game of Life rules are:
    // 1. Dead cells with three live neighbours become a live cell.
    // 2. Dead cells with <3 or >3 neighbours stay dead.
    // 3. A live cell with 2 or 3 live neighbours stays alive.
    // 4. A live cell with <2 or >3 live neighbours dies.
    // '⬜' is a live cell, also 'b' or 'X'
    // '⬛' is a dead cell, also 'o' or '.'
    const CONWAY_RULES_LOOKUP = { // Original Conway's Game of Life rules
    '⬜': [ // rule lookup for live cells
    '⬛', // with 0 neighbors, dies
    '⬛', // with 1 neighbors, dies
    '⬜', // with 2 neighbors, stays alive
    '⬜', // with 3 neighbors, stays alive
    '⬛', // with 4 neighbors, dies
    '⬛', // with 5 neighbors, dies
    '⬛', // with 6 neighbors, dies
    '⬛', // with 7 neighbors, dies
    '⬛', // with 8 neighbors, dies
    ],
    '⬛': [ // rule lookup for dead cells
    '⬛', // with 0 neighbors, stays dead
    '⬛', // with 1 neighbors, stays dead
    '⬛', // with 2 neighbors, stays dead
    '⬜', // with 3 neighbors, becomes alive
    '⬛', // with 4 neighbors, stays dead
    '⬛', // with 5 neighbors, stays dead
    '⬛', // with 6 neighbors, stays dead
    '⬛', // with 7 neighbors, stays dead
    '⬛', // with 8 neighbors, stays dead
    ],
    }
    //
    // Red Team🟥 Blue Team🟦 rules are:
    // '🟥' is a live red team cell, also 'R'
    // '🟦' is a live blue team cell. also 'B'
    // '⬛' is a dead cell, also 'o' or '.'
    // 0. If you treat both red and blue cells as live, the rules produce the same result as Conway's Game of Life.
    // 1. Dead cells with 3 neighbours become a red cell if 2 or 3 are red.        🟥🟥🟦, 🟥🟥🟥
    // 2. Dead cells with 3 neighbours become a blue cell if 2 or 3 are blue.      🟦🟦🟥, 🟦🟦🟦
    // 3. Dead cells with <3 or >3 neighbours stay dead.
    // 3. A red cell with 3 neighbours and 1, 2, 3 red neighbours stays red.       🟥🟦🟦, 🟥🟥🟦, 🟥🟥🟥
    // 4. A red cell with 3 neighbours and 0 red neighbours (3 blue) becomes blue. 🟦🟦🟦
    // 5. A red cell with 2 neighbours and 1, 2 red neighbours stays red.          🟥🟦, 🟥🟥
    // 6. A red cell with 2 neighbours and 0 red neighbours (2 blue) becomes blue. 🟦🟦
    // 7. A red cell with <2 or >3 neighbours of any color dies.
    // 8. A blue cell with 3 neighbours and 1, 2, 3 blue neighbours stays blue.    🟦🟥🟥, 🟦🟦🟥, 🟦🟦🟦
    // 9. A blue cell with 3 neighbours and 0 blue neighbours (3 red) becomes red. 🟥🟥🟥
    // 10. A blue cell with 2 neighbours and 1, 2 blue neighbours stays blue.      🟦🟥, 🟦🟦
    // 11. A blue cell with 2 neighbours and 0 blue neighbours (2 red) becomes red.🟥🟥
    // 12. A blue cell with <2 or >3 neighbours of any color dies.
    const RED_TEAM_BLUE_TEAM_LOOKUP = {
    // lookup new cell by old state, count of live neighbors, and count of red neighbors
    // count of blue neighbors is always live_neighbors - red_neighbors, it's value is redundant
    // arbitrarily chose to index by count of red neighbors
    // Example: new_state = RED_TEAM_BLUE_TEAM_LOOKUP[old_state][live_neighbors][red_neighbors]
    '🟥': [
    /* 0 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 1 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 2 */['🟦', '🟥', '🟥', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 3 */['🟦', '🟥', '🟥', '🟥', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 4 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 5 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 6 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 7 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 8 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    ],
    '🟦': [
    // REMEMBER: we index by red neighbors, so the rule at index(row) 2 is the rule for 2 live neighbors
    // 2nd row first element is 2 - 0 -> 2 blue neighbors, next element is 2 - 1 -> 1 blue neighbor, etc.  
    /* 0 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 1 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 2 */['🟦', '🟦', '🟥', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 3 */['🟦', '🟦', '🟦', '🟥', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 4 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 5 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 6 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 7 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 8 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    ],
    '⬛': [
    /* 0 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 1 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 2 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    // HACK overloading the meaning of red_team_neighbors for Conway mode
    /* 3 */['🟦', '🟦', '🟥', '🟥', '⬛', '⬛', '⬛', '⬛', '⬛', '⬜'],
    /* 4 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 5 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 6 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 7 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 8 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    ],
    '⬜': [
    /* 0 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 1 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 2 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬜'],
    /* 3 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬜'],
    /* 4 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 5 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 6 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 7 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    /* 8 */['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'],
    ],
    }
    // add aliases for cell values
    RED_TEAM_BLUE_TEAM_LOOKUP['R'] = RED_TEAM_BLUE_TEAM_LOOKUP['🟥']
    RED_TEAM_BLUE_TEAM_LOOKUP['B'] = RED_TEAM_BLUE_TEAM_LOOKUP['🟦']
    RED_TEAM_BLUE_TEAM_LOOKUP['o'] = RED_TEAM_BLUE_TEAM_LOOKUP['⬛']
    RED_TEAM_BLUE_TEAM_LOOKUP['.'] = RED_TEAM_BLUE_TEAM_LOOKUP['⬛']
    RED_TEAM_BLUE_TEAM_LOOKUP['b'] = RED_TEAM_BLUE_TEAM_LOOKUP['⬜']
    RED_TEAM_BLUE_TEAM_LOOKUP['X'] = RED_TEAM_BLUE_TEAM_LOOKUP['⬜']
    
    export const rules = RED_TEAM_BLUE_TEAM_LOOKUP
    