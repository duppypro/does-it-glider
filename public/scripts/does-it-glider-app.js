// does it glider app
//

import {gol_field} from './gol-field.js'
import {apply_rules, set_state} from './gol-play.js'
import {draw} from './does-it-glider-draw.js'

console.log('script started')

// initialize
d3.select('body').style('margin', '0px')

const app = d3.select('.does-it-glider-app')

// Create the title
app.append("div")
    .attr("class", "title")
                                    .html("Does it Glider?")
app.append("div")
    .attr("class", "title sub-title")
                                    .html("Paste a Wordle score here.")

// make a gol field in the app DOM element
const field = gol_field(app)

// make a new 2D array the size of the 5x6 start pattern
let start = []
// set the start pattern using life_seed format
start[0] = '⬛⬛⬛⬛⬛'
start[1] = '⬛⬛⬛⬛⬛'
start[2] = '⬛⬛⬜⬛⬛'
start[3] = '⬛⬛⬛⬜⬛'
start[4] = '⬛⬜⬜⬜⬛'
start[5] = '⬛⬛⬛⬛⬛'

// get the width and height of the gol_field
let field_h = field.node().getBoundingClientRect().height
let field_w = field.node().getBoundingClientRect().width
// divide field_h and field_w by 20px and round to int
field_h = Math.round(field_h / 20)
field_w = Math.round(field_w / 20)
// make a new 2D array the size of the g element divide by 20px
// let state = new Array(field_h).fill(new Array(field_w).fill('⬛'))
let state = Array.from({length: field_h}, () => Array.from({length: field_w}, () => '⬛'))

// copy the start into the center of the state
set_state(start, state)

// render start as a 2D array of rects in the svg
draw(field, state)

let beat = (60 * 1000) / 180 // 180bpm for animations, units are in msec

// run the game of life
// call apply_rules() and draw() every beat msecs
setInterval(() => {
    // apply the rules to the state
    state = apply_rules(state)
    // draw the state
    draw(field, state)
}, beat/4)

let life_seed = []

d3.select('body').on('paste', event => {
    event.preventDefault()

    let pasted_clipboard = ''
    let pasted_lines = []
    pasted_clipboard = (event.clipboardData || window.clipboardData || window.Clipboard).getData('text')
    console.log(`paste event heard:\r\n${pasted_clipboard}`)
    // split on \r\n or \r or \n
    pasted_lines = pasted_clipboard.split(/[\r\n]{1,2}/)
    pasted_lines = pasted_lines.map(line => line ? line : '<br/>')
    console.log(`split lines: ${pasted_lines}`)

    // filter pasted_lines for only lines that are length 5
    // and contain only '⬜', '🟨', '🟩', or '⬛'
    let wordle_guesses = []
    wordle_guesses = pasted_lines
        .filter(line => line.match(/⬜|🟨|🟩|⬛|🟦|🟧|o|b/ug)?.length == 5)
    // this is only lines with exactly 5 wordle squares
    console.log(`filtered wordle_guesses: ${wordle_guesses}`)

    // convert all '🟨'|'🟩' in wordle_guesses to '⬜' and '⬜'|'⬛' to '⬛'
    life_seed = []
    wordle_guesses.map(guess =>
        life_seed.push(
            guess
                // need an intermediate character to avoid double replacement
                .replace(/🟨|🟩|🟦|🟧|o/g,'o')
                .replace(/⬜|⬛|b/g,'⬛')
                .replace(/o/g,'⬜') // replace intermediate character
        )
    )
    console.log(`life_seed: ${life_seed}`)

    // fade in pasted_lines
    app
        .selectAll('.paste-line')//.remove()
        .data(pasted_lines)
        .join(
            enter => enter.append('div').classed('paste-line', true)
                .style('min-height', '1.5em'),
            update => update,
            exit => exit
                .remove()
        )
        // new line effect on both enter and join
        .html(line => line)

    const fade_in_guesses = () => {
        app
            .selectAll('.paste-line')
            .data(life_seed)
            // d3js.data() stores the array life_seed on the parent DOM element
            // then d3js.join() compares new data to previous data
            // and calls enter, update, or exit as appropriate for the new data
            .join(
            enter => enter.append('div').classed('paste-line', true)
                .style('min-height', '1.5em'),
            update => update,
            exit => exit
                .remove()
            ) //join returns enter and update merged
            .html((d, i) => wordle_guesses[i])
            .transition().duration(beat)
            .transition().duration(0)
            .text(d => d)
            .transition().duration(beat)
            .remove()

    }

    const load_new_state = (life_seed) => {
        // log time of event
        console.log(`Enter load_new_state: ${new Date().getTime()}`)
        // clear the state
        state = Array.from({length: field_h}, () => Array.from({length: field_w}, () => '⬛'))
        // copy the life_seed into the center of the state
        set_state(life_seed, state)
        draw(field, state)
    }
    // wait before applying the next effect
    // log time of call in milliseconds
    console.log(`Queue load_new_state: ${new Date().getTime()}`)
    setTimeout(load_new_state(life_seed), beat * 100)
    setTimeout(fade_in_guesses, beat)
})
