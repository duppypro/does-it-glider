//////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, 2025 David 'Duppy' Proctor, Interface Arts
//
//////////////////////////////////////////////////////////////////////

// '⚓' is the anchor for the upper left of the **next** step.
// all steps of all patterns shall have exactly 1 wide dead cell '⬛' border

export const glider_templates = []

const g1 = [
    '⬛⬛⬛⬛⬛',
    '⚓⬛⬜⬛⬛',
    '⬛⬛⬛⬜⬛',
    '⬛⬜⬜⬜⬛',
    '⬛⬛⬛⬛⬛'
]

const g2 = [
    '⚓⬛⬛⬛⬛',
    '⬛⬜⬛⬜⬛',
    '⬛⬛⬜⬜⬛',
    '⬛⬛⬜⬛⬛',
    '⬛⬛⬛⬛⬛'
]

const g3 = [
    '⬛⚓⬛⬛⬛',
    '⬛⬛⬛⬜⬛',
    '⬛⬜⬛⬜⬛',
    '⬛⬛⬜⬜⬛',
    '⬛⬛⬛⬛⬛'
]

const g4 = [
    '⚓⬛⬛⬛⬛',
    '⬛⬜⬛⬛⬛',
    '⬛⬛⬜⬜⬛',
    '⬛⬜⬜⬛⬛',
    '⬛⬛⬛⬛⬛'
]

glider_templates.push([g1, g2, g3, g4])
