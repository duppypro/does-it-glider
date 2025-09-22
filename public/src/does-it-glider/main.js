//////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, 2025 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider or 'dig'
//      main
//////////////////////////////////////////////////////////////////////

// Imports
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"
import * as dig from './imports.js' // dig is short for Does-It-Glider
import * as local_stats from './local-stats.js'

//
// Create the mostly static DOM elements for does-it-glider app
//

// Find the top app div by unique ID
const app_sel = d3.select('#does-it-glider-app')

// Create the title    
const _title = 'Does it Glider?'
const _sub_title = 'Tap here to paste Wordle score.'
// max width ---- '##################################'
// abbove #'s are max width on smallest mobile (iPhone SE)

const touch_target_sel = app_sel.append('span').classed('touch-target', true)
touch_target_sel.append('div').classed('title', true)
    .html(_title)
touch_target_sel.append('div').classed('title sub-title', true)
    .html(_sub_title)

// Create the stats display
const stats_sel = app_sel.append('span').classed('stats', true)
const gen_count_sel = stats_sel.append('div').classed('gen-count', true)
    .html('----')
const seed_count_sel = stats_sel.append('div').classed('seed-count', true)
    .html('Seeds submitted: -')
const max_gen_count_sel = stats_sel.append('div').classed('max-gen-count', true)
     .html('Max generations: ----')

// get the width and height of the grid and screen size parameters
const line_height = Math.max(12, touch_target_sel.select('.sub-title').node().clientHeight)
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
let ping_pong = true // ping_pong is true when ping is the current grid, pong is the next grid

let gen_count = 0
let prior_max_gen_count = local_stats.get_max_gen_count() || 0
const msec_per_tick = 1000.0 / 60.0 // 60fps requestAnimationFrame() defacto standard
let new_pause_countdown = NEW_PAUSE_MSEC
let beat_pasted = MSEC_PER_BEAT
let msec_per_gen = MSEC_PER_GEN
let msec_to_next_gen = 0
let seed = [] // TODO do better than using a global for the seed across the paste animations

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
        draw_gen_count()
        if (new_pause_countdown <= 0 && gen_count < 9999) {
            ping_pong = !ping_pong
            // when ping_pong is true, grid_ping gets the new grid
            if (ping_pong) {
                dig.apply_rules_old_new(grid_pong, grid_ping)
            } else {
                dig.apply_rules_old_new(grid_ping, grid_pong)
            }
            gen_count++
            // Update max_gen_count if needed
            if (gen_count > prior_max_gen_count) {
                prior_max_gen_count = gen_count
                local_stats.set_max_gen_count(gen_count)
                draw_max_gen_count()
            }
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

function draw_gen_count() {
    gen_count_sel.html(`${gen_count}`.padStart(4, '0'))
}

function draw_seed_count() {
    const count = local_stats.get_seed_count()
    seed_count_sel.html(`Seeds submitted: ${count}`)
}

function draw_max_gen_count() {
    const count = local_stats.get_max_gen_count()
    max_gen_count_sel.html(`Max generations: ${count}`)
}    

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
        line = line.trim()
        const guess = line.match(/^(⬜|🟨|🟩|⬛|🟦|🟧|o|b|R|B){5}$/u)
        return guess && guess[0] || ''    })
    // this is only the lines with exactly 5 wordle squares

    // convert all '🟨'|'🟩' in wordle_guesses to '⬜' and '⬜'|'⬛' to '⬛'
    const text_line_to_seed_line = (line) => {
        if (!line) return line
        // Convert to array of code points for robust emoji handling
        return Array.from(line).map(char => {
            switch (char) {
                case '⬜': // Wordle white is light mode empty
                case '⬛': // Wordle black is dark mode empty
                case 'b':  // 'b' is blank/empty/dead in the $bbobb$ format
                    return '⬛'
                case '🟨': // Wordle yellow is dark mode alive
                case '🟧': // orange is light mode alive
                case '🟩': // green is dark mode alive
                case '🟦': // blue is light mode alive
                case 'o':  // 'o' is alive in the $bbobb$ format
                    return '⬜'
                case 'R':
                    return '🟥'
                case 'B':
                    return '🟦'
                default:
                    return char
            }
        }).join('')
    }

    seed = []
    guesses.forEach(guess => { // CodeRabbit: forEach not map cuz map's return is not used
        guess = text_line_to_seed_line(guess)
        if (guess?.length) {
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
                if (i == last_line) {
                    load_new_seed(seed?.length ? seed : attract_seed)
                }
            })
    }

    draw_clipboard_lines()
    // ??? is there a better method that hooks into the end of the CSS animation instead of D3?
    // ??? if so, then am I using d3 for anything other than zoom transform or a fancier jquery?

    // After parsing, if seed is valid then store it in local storage
    if (seed && seed.length > 0) {
        const hash = local_stats.hash_seed(seed)
        local_stats.add_seed_hash(hash)
        draw_seed_count()
    }

} // end parse_clipboard()

const get_clipboard_text = (event) => {
    event.preventDefault()
    // get clipboard text, ignore event input because it might be a click event not paste
    navigator.clipboard.readText()
        .then(parse_clipboard)
        .catch(() => { /* no-op */ })
}

// First code run after creation of mostly static DOM elements
// Initial draw of stats from local storage
draw_gen_count()
draw_seed_count()
draw_max_gen_count()
load_new_seed(attract_seed)
event_loop() // start the event loop, it will trigger itself continually

// paste from clipboard on click(touch) (ignore paste) event to deal with mobile browsers
touch_target_sel.on('click', get_clipboard_text)
