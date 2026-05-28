//////////////////////////////////////////////////////////////////////
//  (c) 2023-2026 David 'Duppy' Proctor, Interface Arts
//
//////////////////////////////////////////////////////////////////////

// '⚓' is the anchor for the upper left of the **next** step.
// 'S' marks a coordinate in the moat that is "Safe Noise" (dies instantly without affecting the glider)
// all steps of all patterns shall have exactly 1 wide dead cell '⬛' border

export const glider_templates = []

const g1 = [
    'S⬛⬛⬛⬛',
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
    'S⚓⬛⬛⬛',
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
