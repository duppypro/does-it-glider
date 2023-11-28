//////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  main
//      top-level code for does-it-glider
//////////////////////////////////////////////////////////////////////

// Configuration
import { settings } from '/lib/settings.js'

import { webgl_context } from '/src/mywebgl/render.js'

import { draw } from '/src/does-it-glider/draw.js'
import { apply_rules, set_state } from '/src/conway/play.js'
import { grid } from '/src/conway/grid.js'

// Init
import { add_mynew } from '/lib/d3-helper.js'
add_mynew()

// initialize
let app = d3.select('.does-it-glider-app')
if (app.empty()) {
    app = d3.select('body').mynew(`div.does-it-glider-app`, ':first-child')
}

// make 2 divs, one for top half, one for bottom half of the app
// top half
const svg_div = app.mynew('div.top')
    .style('overflow', 'hidden') // TODO figure out how many of the elements need overflow: hidden
    .style('background', '#040')

// bottom half
const webgl_div = app.mynew('div.bottom')
    .style('overflow', 'hidden')
    .style('position', 'relative')

    // Position the divs using flex grid
    app.style('display', 'flex')
        .style('flex-direction', 'column')
    
    app.selectAll('div')
        .style('flex', '1')
        // .style('width', '100%')
        .style('height', '100vh')
        .style('box-sizing', 'border-box')
        .style('padding', '10px')

// Create the title    
let touch_target = app.append('span')
    .classed('touch-target', true)

const _title = 'Does it Glider?'    
const _sub_title = 'Tap here to paste Wordle score.'
// max width reference: '##################################'
// abbove is max width on smallest mobile (iPhone SE)

touch_target.append('div')
    .attr('class', 'title')
    .html(_title)
    
touch_target.append('div')
    .attr('class', 'title sub-title')
    .html(_sub_title)

// make a gol field in the app DOM element
const field = grid(svg_div)

// make a new 2D array the size of the 5x6 start pattern
let start = []
// set the start pattern using life_seed format
start[0] = '⬛⬛⬛⬛⬛'
start[1] = '⬛⬛⬛⬛⬛'
start[2] = '⬛⬛⬜⬛⬛'
start[3] = '⬛⬛⬛⬜⬛'
start[4] = '⬛⬜⬜⬜⬛'
start[5] = '⬛⬛⬛⬛⬛'

//test a wordle fight pattern
/*
ooRRRoooooBoooB
ooRRRoooooooBBo
RRRRRoooooBBBBB
ooooooooooooooo
ooooooooooooooo
ooooooooooooooo
*/

let red_team = []
red_team[0] = 'ooRRR'
red_team[1] = 'ooRRR'
red_team[2] = 'RRRRR'
red_team[3] = 'ooooo'
red_team[4] = 'ooooo'
red_team[5] = 'ooooo'

let blue_team = []
blue_team[0] = 'BoooB'
blue_team[1] = 'ooBBo'
blue_team[2] = 'BBBBB'
blue_team[3] = 'ooooo'
blue_team[4] = 'ooooo'
blue_team[5] = 'ooooo'

let partial_mosquito = []
partial_mosquito[0] = 'ooooo'
partial_mosquito[1] = 'ooooo'
partial_mosquito[2] = 'oooBo'
partial_mosquito[3] = 'ooooB'
partial_mosquito[4] = 'BoooB'
partial_mosquito[5] = 'oBBBB'

let fight_paces = 5
// join red team and blue team into start with red team on left and fight_paces dead cells in between
// start = red_team.map((row, i) => row + 'o'.repeat(fight_paces) + blue_team[i])
// start = blue_team.map((row, i) => row + 'ooooo' + red_team[i])

start.forEach((row, i) => {
    start[i] = row
        .replace(/🟦/g, 'B')
        .replace(/🟥/g, 'R')
        .replace(/⬜/g, 'b')
        .replace(/⬛/g, 'o')
        .replace(/X/g, 'b')
        .replace(/\./g, 'o')
})

// get the width and height of the gol_field
let field_h = field.node().getBoundingClientRect().height
let field_w = field.node().getBoundingClientRect().width
// divide field_h and field_w by 20px and round to int
field_h = Math.round(field_h / 20)
field_w = Math.round(field_w / 20)
// make a new 2D array the size of the g element divide by 20px
let state = Array.from({ length: field_h }, () => Array.from({ length: field_w }, () => 'o'))

// copy the start into the center of the state
set_state(start, state)

let tick = 0
let num_ticks = Math.floor(settings.BEAT / (1000 / 60)) // BEAT is in msec / (1000/60) is msec/frame
num_ticks = Math.floor(num_ticks / 4) // speed up
let pause_for_new = 2 * 60
const event_loop = () => {
    if (pause_for_new == 0) {    // apply the rules to the state
        if (tick % num_ticks == 0) { // only draw every num_ticks frames
            state = apply_rules(state)
        }
    } else {
        pause_for_new--
    }
    draw(field, state)
    tick++
    requestAnimationFrame(event_loop) // BUG this might fix issue #5. UPDATE #5 is not fixed
}
requestAnimationFrame(event_loop)

let life_seed = []

const parse_clipboard = (pasted_clipboard) => {
    let pasted_lines = []
    pasted_lines = pasted_clipboard.split(/\r\n|\r|\n/ug)

    // filter pasted_lines for only lines that are length 5
    // and contain only '⬜', '🟨', '🟩', or '⬛'
    let wordle_guesses = []
    wordle_guesses = pasted_lines
        .filter(line => line.match(/^(⬜|🟨|🟩|⬛|🟦|🟧|o|b|R|B|X|\.)+$/ug))
    // this is only the lines with exactly 5 wordle squares
    console.log(`filtered wordle_guesses: ${wordle_guesses}`)

    // convert all '🟨'|'🟩' in wordle_guesses to '⬜' and '⬜'|'⬛' to '⬛'
    life_seed = []
    wordle_guesses.map(guess =>
        life_seed.push(
            guess
                // need an intermediate character to avoid double replacement
                // try red team 🟥 blue team 🟦 fight idea
                .replace(/🟨|🟧/g, 'R') // hits in wrong location are red team
                .replace(/🟩|🟦/g, 'B') // hits in correct location are blue team
                .replace(/⬜|⬛/g, 'o')
                .replace(/🟦/g, 'B')
                .replace(/🟥/g, 'R')
                .replace(/X/g, 'B')
                .replace(/\./g, 'o')
        )
    )
    console.log(`life_seed:\n ${life_seed}`)

    let beat_pasted = settings.BEAT
    let beat_wordle_guesses = settings.BEAT
    let beat_life_seed = settings.BEAT
    // draw/render pasted_lines in the .paste-line divs
    const draw_pasted_lines = () => {
        const transition = app
            .selectAll('.paste-line')
            .data(pasted_lines)
            .join(
                enter => enter.append('div').classed('paste-line', true),
                update => update,
                exit => exit
                    .remove()
            )
            // new line effect on both enter and update
            .html(line => line || '&nbsp;')
            .transition().duration(beat_pasted)
            .remove()
            .on('end', draw_wordle_guesses())
    }

    const draw_wordle_guesses = () => {
        const transiton = app
            .selectAll('.paste-line')
            .data(wordle_guesses)
            // d3.data() stores the array life_seed on the parent DOM element
            // then d3.join() compares new data to previous data
            // and calls enter, update, or exit on each element of data array
            // as appropriate for diff of new data comapred to previous data
            .join(
                enter => enter.append('div').classed('paste-line', true),
                update => update,
                exit => exit
                    .remove()
            ) //join returns enter and update merged
            // .selection()
            .html(d => d)
            .transition().duration(beat_wordle_guesses)
            .remove()
            .on('end', () => {
                draw_life_seed()
            })
    }

    const draw_life_seed = () => {
        const transition = app
            .selectAll('.paste-line')
            .data(life_seed)
            .html(d => d)
            .transition().duration(beat_life_seed)
            .remove()
            .on('end', () => {
                load_new_state(life_seed || start)
            })
    }

    const load_new_state = (life_seed) => {
        console.time('load_new_state')

        // clear the state
        state = Array.from({ length: field_h }, () => Array.from({ length: field_w }, () => 'o'))
        // copy the life_seed into the center of the state
        set_state(life_seed, state)
        pause_for_new = 2 * 60

        console.timeEnd('load_new_state')
    }

    draw_pasted_lines()
    // draw_wordle_guesses()
    // load_new_state(life_seed || start)
    // draw_life_seed()
} // end parse_clipboard()

const get_clipboard_text = async (event) => {
    // get clipboard text
    const pasted_clipboard = await navigator.clipboard.readText()
    // BUG #2: pasted_clipboard not working on mobile browsers
    console.log(`pasted_clipboard:\r\n${pasted_clipboard}`)
    parse_clipboard(pasted_clipboard)
}

// paste from clickboard on click(touch) to deal with mobile browsers
d3.select('.touch-target').on('click', get_clipboard_text)
// also listen for paste event anywhere on the page
d3.select('body').on('paste', get_clipboard_text)

// make a webgl canvas in the left_div
const gl = webgl_context(webgl_div, settings.BEAT)
