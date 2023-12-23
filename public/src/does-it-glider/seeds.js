//////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//////////////////////////////////////////////////////////////////////

// ANCHOR attract mode seeds
let glider_seed = []
glider_seed[0] = '⬛⬛🟦⬛⬛'
glider_seed[1] = '⬛⬛⬛🟦⬛'
glider_seed[2] = '⬛🟦🟦🟦⬛'

//test a RED team BLUE team wordle fight seed
/*
⬛⬛🟥🟥🟥⬛⬛⬛⬛⬛🟦⬛⬛⬛🟦
⬛⬛🟥🟥🟥⬛⬛⬛⬛⬛⬛⬛🟦🟦⬛
🟥🟥🟥🟥🟥⬛⬛⬛⬛⬛🟦🟦🟦🟦🟦
*/
let red_team = []
red_team[0] = '⬛⬛🟥🟥🟥'
red_team[1] = '⬛⬛🟥🟥🟥'
red_team[2] = '🟥🟥🟥🟥🟥'

let blue_team = []
blue_team[0] = '🟦⬛⬛⬛🟦'
blue_team[1] = '⬛⬛🟦🟦⬛'
blue_team[2] = '🟦🟦🟦🟦🟦'

// join red team and blue team into start with red team on left
// and fight_paces dead cells in between
const fight_paces = 5;
let red_v_blue = red_team.map(
    (red_row, i) => {
        red_row + '⬛'.repeat(fight_paces) + blue_team[i]
    }
)

// a mosquito seed glides horizontally
let partial_mosquito = []
partial_mosquito[0] = '⬛⬛⬛🟩⬛'
partial_mosquito[1] = '⬛⬛⬛⬛🟩'
partial_mosquito[2] = '🟩⬛⬛⬛🟩'
partial_mosquito[3] = '⬛🟩🟩🟩🟩'

export const attract_seed = glider_seed