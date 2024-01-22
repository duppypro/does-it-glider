//////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider or 'dig'
//      main
//////////////////////////////////////////////////////////////////////

// nick names so I can type less
const {log, warn, err} = console

// Imports
import { d3_plus as d3 } from '../../lib/d3-helper.js'
import * as dig from './imports.js'

const app_sel = d3.select('#does-it-glider-app')
if (app_sel.empty()) {
    err('<div> with id="does-it-glider-app" not found.')
}


// Create the title    
const touch_target = app_sel.append('span')
.classed('touch-target', true)

const _title = 'Does it Glider?'
const _sub_title = 'Tap here to paste Wordle score.'
// max width ---- '##################################'
// abbove #'s are max width on smallest mobile (iPhone SE)
// TODO add speedometer to allow speed control
// <img src="https://icons.iconarchive.com/icons/pictogrammers/material/48/speedometer-icon.png" width="48" height="48">

touch_target.append('div')
.attr('class', 'title')
.html(_title)
touch_target.append('div')
.attr('class', 'title sub-title')
.html(_sub_title)
touch_target.append('div')
.attr('class', 'title gen-count')
.html('00000')

// get the width and height of the grid and screen size parameters
const line_height = touch_target.select('.sub-title').node().clientHeight
let {
    GRID_HEIGHT, GRID_WIDTH, CELL_PX,
    NEW_PAUSE_MSEC, MSEC_PER_BEAT, MSEC_PER_GEN,
} = dig.settings

// make a grid in the app DOM element
const grid_sel = dig.append_grid(app_sel, CELL_PX, GRID_WIDTH, GRID_HEIGHT)

const attract_seed = dig.seeds.glider // glider or red_blue

// make a new 2D array the size of the g element divide by 20px
// TODO move ping pong into game-board modules
let grid_ping = Array.from({ length: GRID_HEIGHT }, () => Array.from({ length: GRID_WIDTH }, () => '⬛'))
let grid_pong = Array.from({ length: GRID_HEIGHT }, () => Array.from({ length: GRID_WIDTH }, () => '⬛'))

let gen_count
const msec_per_tick = 1000.0 / 60.0 // 60fps requestAnimationFrame() defacto standard
let new_pause_countdown = NEW_PAUSE_MSEC
let ping_pong = true // ping_pong is true when ping is the current grid, pong is the next grid
let beat_pasted = MSEC_PER_BEAT
let msec_per_gen = MSEC_PER_GEN
let msec_to_next_gen = 0

const event_loop = () => {
    dig.draw(
        grid_sel,
        ping_pong ? grid_ping : grid_pong,
        CELL_PX, // HACK gotta be a better way to pass CELL_PX
        d3.easeQuadOut(1.0 - new_pause_countdown / NEW_PAUSE_MSEC) // opacity fade in
    )
    // TODO only draw if needed for pan + zoom

    if (msec_to_next_gen <= 0) {
        msec_to_next_gen += msec_per_gen
        d3.select('.gen-count').html(`${gen_count}`.padStart(5, '0'))
        if (new_pause_countdown <= 0 && gen_count < 9999) {
            ping_pong = !ping_pong
            // when ping_pong is true, grid_ping gets the new grid
            if (ping_pong) {
                dig.apply_rules_old_new(grid_pong, grid_ping)
            } else {
                dig.apply_rules_old_new(grid_ping, grid_pong)
            }
            gen_count++
        }
    }
    new_pause_countdown > 0 ? new_pause_countdown -= msec_per_tick : new_pause_countdown = 0
    msec_to_next_gen -= msec_per_tick
    requestAnimationFrame(event_loop)
}

const load_new_seed = (new_seed) => {
    // TODO next: why did I declare this in here? move it to grid.js
    // might require moving ping pong into grid.js
    let grid_now = ping_pong ? grid_ping : grid_pong

    // fix new_seed rows to be array of chars instead of strings
    // this makes indexing work with multi byte unicode characters
    // if the row is already an array its a no-op ([...row] == [...[...row]])
    new_seed = new_seed.map(row => [...row])
    // TODO LOW PRI: move this 2d array fixup into seeds.js

    dig.clear_grid(grid_now)
    dig.add_seed(new_seed, grid_now)

    new_pause_countdown = NEW_PAUSE_MSEC
    gen_count = 0
}

load_new_seed(attract_seed)
event_loop() // try triggering the event loop to get the first frame of a new seed to draw


let seed = [] // TODO do better than using a global for the seed across the paste animations

const parse_clipboard = (pasted_clipboard) => {
    let pasted_lines = []
    // for importing RLE patterns
    pasted_lines = pasted_clipboard.replace(/\$|!/ug, '\n') // '$' used as end of line and '!' used as end of seed in RLE format
    pasted_lines = pasted_lines.split(/\r\n|\r|\n/ug) // TODO is this regex needed for all platforms?
    pasted_lines = pasted_lines.slice(0, 24) // limit to 24 lines (arbitrary limit, only 6 can be Wordle lines)

    // filter pasted_lines for only lines that are length 5
    // and contain only '⬜', '🟨', '🟩', or '⬛' (or their aliases)
    // use .map() instead of .filter() so the index is preserved
    let guesses = []
    guesses = pasted_lines.map(line => {
        line.trim()
        const guess = line.match(/^(⬜|🟨|🟩|⬛|🟦|🟧|o|b|R|B|X|\.){5,5}$/ug)
        return guess && guess[0] || ''
    })
    // this is only the lines with exactly 5 wordle squares

    // convert all '🟨'|'🟩' in wordle_guesses to '⬜' and '⬜'|'⬛' to '⬛'
    const text_line_to_seed_line = (line) => {
        return line && line
            // this replacememnt is unique to guesses from wordle
            // There is a problem that the high contrast mode of Wordle uses '⬜' for dead/empty
            // but all the other formats I want to support use '⬜' for alive
            // need an intermediate character to avoid double replacement
            .replace(/⬜|⬛/ug, '⬛')
            .replace(/🟨|🟧/ug, '⬜')
            .replace(/🟩|🟦/ug, '⬜')
            .replace(/\./ug, '⬛')
            .replace(/X/ug, '⬜')
            .replace(/o/ug, '⬛')
            .replace(/b/ug, '⬜')
    }

    seed = []
    guesses.map(guess => {
        guess = text_line_to_seed_line(guess)
        if (guess?.length == 5) {
            seed.push(guess)
        }
    })
    seed = seed.slice(0, 6) // limit to 6 lines, the max number of guesses in Wordle

    // draw/render pasted_lines in the .paste-line divs
    const draw_clipboard_lines = () => {
        const last_line = pasted_lines.length - 1
        const cw = app_sel.node().clientWidth
        const ch = app_sel.node().clientHeight
        pasted_lines.reverse() // reverse the order so the last line is at the bottom
        app_sel
            .selectAll('.paste-line')
            .data(pasted_lines)
            .join(
                enter => enter.append('div').classed('paste-line', true)
                    .style('position', 'absolute')
                    .style('background-color', '#00000000')
                    .style('opacity', 1)
                    .style('transform', 'scale(1)')
                    .style('top', (_d, i) => `${-(i + 1) * line_height}px`) // drop in from above the screen
                    .style('text-align', 'center'),
                update => update,
                exit => exit.remove()
            )
            .html(line => line || '&nbsp;')
            .transition().duration((_d, i) => beat_pasted)
            .delay((_d, i) => i * beat_pasted / 4) // stagger the lines
            .ease(d3.easePolyIn.exponent(3))
            .style('top', (_d, i) => {
                const top = `${ch * 1 / 2 - (i - 2) * line_height}px`
                return top
            })
            .transition().delay((_d, i) => (last_line - i) * beat_pasted / 4)
            .on('end', (_d, i) => {
                if (i == last_line) {
                    dig.clear_grid(ping_pong ? grid_ping : grid_pong)
                    dig.zoom_grid(0, 0, 1) // TODO zoom_grid has it's own transition duration.
                    // TODO Improve this so the duration of zoom_grid and the next transition off screen
                    // TODO don't have to be manually synced
                }
            })
            .transition().duration(beat_pasted)
            .style('opacity', 0)
            .style('transform', `scale(0)`)
            .style('top', `${ch * 1 / 2}px`)
            .remove()
            .on('end', (_d, i) => {
                if (i == last_line) load_new_seed(seed?.length ? seed : attract_seed)
            })
    }

    draw_clipboard_lines()
    // ??? is there a better method that hooks into the end of the CSS animation instead of D3?
    // ??? if so, then am I using d3 for anything other than zoom transform or a fancier jquery?
} // end parse_clipboard()

const get_clipboard_text = (event) => {
    event.preventDefault()
    // get clipboard text, ignore event input because it might be a click event not paste
    navigator.clipboard.readText()
        .then(parse_clipboard)
    // BUG #2: paste not working on mobile browsers, haven't tested navigator.clipboard.readText() on mobile yet
}

// paste from clipboard on click(touch) (ignore paste) event to deal with mobile browsers
d3.select('.touch-target').on('click', get_clipboard_text)
