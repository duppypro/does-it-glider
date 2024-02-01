//////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, David 'Duppy' Proctor, Interface Arts
//
//////////////////////////////////////////////////////////////////////

let step, row
// '' matches any color/state cell
// '⚓' is the anchor for the upper left of the **next** step.
// all steps of all patterns shall have exactly 1 wide dead cell '⬛' border

// ANCHOR patterns defined '⚓⬛⬜⬛⬛'
// TODO how to deal with rotation? Programmatically or explicitly?
// TODO Use apply_rules to generate these? No, but do use apply_rules to test!

let glider = {}
glider.pattern = [[]]
step = 0

row = 0
glider.pattern[step][row++] = '⬛⬛⬛⬛⬛'
glider.pattern[step][row++] = '⚓⬛⬜⬛⬛'
glider.pattern[step][row++] = '⬛⬛⬛⬜⬛'
glider.pattern[step][row++] = '⬛⬜⬜⬜⬛'
glider.pattern[step][row++] = '⬛⬛⬛⬛⬛'
step++

row = 0
glider.pattern[step][row++] = '⚓⬛⬛⬛⬛'
glider.pattern[step][row++] = '⬛⬜⬛⬜⬛'
glider.pattern[step][row++] = '⬛⬛⬜⬜⬛'
glider.pattern[step][row++] = '⬛⬛⬜⬛⬛'
glider.pattern[step][row++] = '⬛⬛⬛⬛⬛'
step++

row = 0
glider.pattern[step][row++] = '⬛⚓⬛⬛⬛'
glider.pattern[step][row++] = '⬛⬛⬛⬜⬛'
glider.pattern[step][row++] = '⬛⬜⬛⬜⬛'
glider.pattern[step][row++] = '⬛⬛⬜⬜⬛'
glider.pattern[step][row++] = '⬛⬛⬛⬛⬛'
step++

row = 0
glider.pattern[step][row++] = '⚓⬛⬛⬛⬛'
glider.pattern[step][row++] = '⬛⬜⬛⬛⬛'
glider.pattern[step][row++] = '⬛⬛⬜⬜⬛'
glider.pattern[step][row++] = '⬛⬜⬜⬛⬛'
glider.pattern[step][row++] = '⬛⬛⬛⬛⬛'
step++

let spinner = {}
spinner.pattern = [[]]
step = 0

row = 0
spinner.pattern[step][row++] = '⚓⬛⬛⬛⬛'
spinner.pattern[step][row++] = '⬛⬛⬜⬛⬛'
spinner.pattern[step][row++] = '⬛⬛⬜⬛⬛'
spinner.pattern[step][row++] = '⬛⬛⬜⬛⬛'
spinner.pattern[step][row++] = '⬛⬛⬛⬛⬛'
step++

row = 0
spinner.pattern[step][row++] = '⚓⬛⬛⬛⬛'
spinner.pattern[step][row++] = '⬛⬛⬛⬛⬛'
spinner.pattern[step][row++] = '⬛⬜⬜⬜⬛'
spinner.pattern[step][row++] = '⬛⬛⬛⬛⬛'
spinner.pattern[step][row++] = '⬛⬛⬛⬛⬛'
step++
