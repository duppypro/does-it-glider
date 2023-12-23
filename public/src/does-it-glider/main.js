//////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  main
//      top-level code for does-it-glider
//////////////////////////////////////////////////////////////////////

// Configuration
import { settings } from './settings.js'
import { d3_plus as d3 } from '../../lib/d3-helper.js'

// Conway's Game of Life modules
import {
    apply_rules as apply_rules_old_new,
    add_seed,
    clear_grid,
} from '../conway/play.js'
import {
    append_grid,
    zoom_grid,
} from '../conway/grid.js'

// does-it-glider svg modules
import { draw } from './draw.js'
import { attract_seed } from './seeds.js'

// WebGL modules
import { webgl_context } from '../mywebgl/render.js'

// Init
const log = console.log
const warn = console.warn
const err = console.error
const min = Math.min
const max = Math.max
const round = Math.round

// get query params
const urlParams = new URLSearchParams(window.location.search)
const version = urlParams.get('v') || 'stable'
const use_gl = false //version == 'beta' || version == 'both'
const use_svg = true //version == 'stable' || version == 'both'
// warn if using the beta version
if (use_gl) {
    warn(`Using Beta WebGL version.`)
}
// initialize
let app = d3.select('.does-it-glider-app')
if (app.empty()) {
    app = d3.select('body').mynew(`div.does-it-glider-app`, ':first-child')
}

// Position the divs using flex grid
// get the width and height of the app
let app_rect = app.node().getBoundingClientRect()
app.style('display', 'flex')
    // set the flex direction based on the aspect ratio of the app container
    .style('flex-direction', (app_rect.width > app_rect.height) ? 'row' : 'column')

const empty_sel = d3.select()
let svg_div = empty_sel // initialize to empty selection
let webgl_div = empty_sel // initialize to empty selection

if (use_svg) {
    svg_div = app.mynew('div.top')
        .style('background', '#000000ff') // out of bounds color
}

if (use_gl) {
    webgl_div = app.mynew('div.bottom')
        .style('background', '#e600ffff') // should never see this color
}

app.selectAll('.top,.bottom') // styles in common for both divs
    .style('overflow', 'hidden') // tested, this is needed to avoid scroll bars
    .style('position', 'relative')
    .style('flex', '1')

// Create the title    
let touch_target = app.append('span')
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
let line_height = touch_target.select('.sub-title').node().clientHeight

// get the width and height of the grid
let grid_h = settings.GRID_HEIGHT
let grid_w = settings.GRID_WIDTH
let cell_px = settings.CELL_PX
// make a grid in the app DOM element
let grid_sel = empty_sel
if (use_svg) {
    grid_sel = append_grid(svg_div, cell_px, grid_w, grid_h)
}

// make a new 2D array the size of the g element divide by 20px
let grid_ping = Array.from({ length: grid_h }, () => Array.from({ length: grid_w }, () => '⬛'))
let grid_pong = Array.from({ length: grid_h }, () => Array.from({ length: grid_w }, () => '⬛'))

const event_loop = () => {
    draw(
        grid_sel,
        ping_pong ? grid_ping : grid_pong,
        cell_px, // HACK gotta be a better way to pass CELL_PX
        pause_for_new ? min(tick / 90, 1.0) : 1.0, // opacity for fade in
    )
    if (tick % ticks_per_frame == 0 && !pause_for_new) { // only apply rules every num_ticks frames
        ping_pong = !ping_pong
        let grid_new = ping_pong ? grid_ping : grid_pong
        let grid_old = ping_pong ? grid_pong : grid_ping
        // TODO try alternating frames draw() and apply_rules() on different frames to shorten the time spent in any one frame handler
        apply_rules_old_new(grid_old, grid_new) // ping_pong is true, grid_ping gets the new grid
    }
    pause_for_new > 0 ? pause_for_new-- : pause_for_new = 0
    tick++
    requestAnimationFrame(event_loop)
}
let tick = 0
let ticks_per_frame = settings.TICKS_PER_FRAME // BEATmsec / (1000msec/60frame) ->  num_ticks has units of frames
let pause_for_new = settings.PAUSE_FOR_NEW // to pause for N seconds, set N sec * 60 frames/sec then round() so that mod (%) works
let ping_pong = true // ping_pong is true when ping is the current grid, pong is the next grid
let beat_pasted = settings.paste_animation.PASTED / 1.333
let beat_guesses = settings.paste_animation.GUESSES
let beat_seed = settings.paste_animation.SEED

const load_new_seed = (new_seed) => {
    let grid_now = ping_pong ? grid_ping : grid_pong
    // clear the grid in place
    clear_grid(grid_now)

    // fix new_seed rows to be array of chars instead of strings
    // this makes indexing work with multi byte unicode characters
    // if the row is already an array its a no-op ([...row] == [...[...row]])
    new_seed = new_seed.map(row => [...row])

    // copy the life_seed into the center of the grid
    add_seed(new_seed, grid_now)
    // replace instadraw with setting a global flag that the event loop will pick up
    tick = 0 // Just use the tick counter to cause a new draw?
    // WARNING ⚠️ this means tick isn't the frame count since beginning of time, just frame count since new seed
    // also: generation # != frame count

    pause_for_new = round((2 * beat_seed / 1000) * 60) // secs * frames/sec => units of frames

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
    log(`filtered wordle_guesses:\n${guesses.join('\n')}`)
    // TODO limit number of lines found to 6

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
    log(`life_seed:\n${seed.join('\n')}`)

    // draw/render pasted_lines in the .paste-line divs
    const draw_clipboard_lines = () => {
        const last_line = pasted_lines.length - 1
        const cw = app.node().clientWidth
        const ch = app.node().clientHeight
        app
            .selectAll('.paste-line')
            .data(pasted_lines.reverse()) // reverse the order so the last line is at the bottom
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
                    clear_grid(ping_pong ? grid_ping : grid_pong)
                    // FIXED for realz #3: zoom_grid() re-center on paste works
                    zoom_grid(0, 0, 1) // TODO zoom_grid has it's own transition duration.
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

    draw_clipboard_lines() // this function will chain to the next functions
    // ??? is there a better method that hooks into the end of the CSS animation instead of D3?
    // ??? if so, then am I using d3 for anything other than zoom transform or a fancier jquery?
} // end parse_clipboard()

const get_clipboard_text = (event) => {
    event.preventDefault()
    // get clipboard text, ignore event input because it might be a click event not paste
    navigator.clipboard.readText()
        .then(clipboard => {
            log(`clipboard:\n${clipboard}\n`)
            parse_clipboard(clipboard)
        })
    // BUG #2: paste not working on mobile browsers, haven't tested navigator.clipboard.readText() on mobile yet
}

// paste from clipboard on click(touch) (ignore paste) event to deal with mobile browsers
d3.select('.touch-target').on('click', get_clipboard_text)

// make a webgl canvas in the other div
if (use_gl) {
    const gl = webgl_context(webgl_div)
}
