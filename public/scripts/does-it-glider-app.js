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
let touch_target = app.append("span")
    .classed("touch-target", true)
    .style("z-index", "2")

const _title =                 "Does it Glider?"
const _sub_title =      "Tap here to paste Wordle score."
// max width reference: "##################################"
// abbove is max width on smallest mobile (iPhone SE)

touch_target.append("div")
    .attr("class", "title")
    .html(_title)
touch_target.append("div")
    .attr("class", "title sub-title")
    .html(_sub_title)

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

// d3.select('body').on('paste', event => {
d3.selectAll('.touch-target').on('drag', e => {
    console.log('drag event blocked')
    e.stopPropagation()
    e.preventDefault()
})
d3.selectAll('.touch-target').on('zoom', e => {
    console.log('zoom event blocked')
    e.stopPropagation()
    e.preventDefault()
})
d3.selectAll('.touch-target').on('scroll', e => {
    console.log('scroll event blocked')
    e.stopPropagation()
    e.preventDefault()
})

const get_clipboard = (pasted_clipboard) => {
    console.log('click event heard')

    let pasted_lines = []
    console.log(`pasted_clipboard: ${pasted_clipboard}`)
    pasted_lines = pasted_clipboard.split(/\r\n|\r|\n/ug)
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

    let beat_pasted = beat
    let beat_wordle_guesses = beat
    let beat_life_seed = beat
    // draw/render pasted_lines in the .paste-line divs
    const draw_pasted_lines = () => {
        app
            .selectAll('.paste-line')
            .data(pasted_lines)
            .join(
                enter => enter.append('div').classed('paste-line', true)
                    .style('min-height', '1.5em'),
                update => update,
                exit => exit
                    .remove()
            )
            // new line effect on both enter and update
            .html(line => line || '&nbsp;')
            .transition()
            .delay(0)
            .duration(beat_pasted)
            .remove()
    }

    const draw_guesses = () => {
        app
            .selectAll('.paste-line')
            .data(life_seed)
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
            .selection(0)
            .transition()
            .delay(beat_pasted)
            .duration(0)
            .selection()
            .html((_data, i) => wordle_guesses[i])
            .transition()
            .delay(beat_wordle_guesses)
            .duration(0)
            .selection()
            .html(d => d)
            .transition()
            .delay(beat_wordle_guesses)
            .duration(0)
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

    draw_pasted_lines()
    // draw_guesses()
    setTimeout(
        load_new_state.bind(null, life_seed),
        beat_pasted + beat_wordle_guesses + beat_life_seed
    )
}

d3.select('.touch-target').on('click', event => {
    event.preventDefault()
    navigator.clipboard.readText().then(get_clipboard)
})


