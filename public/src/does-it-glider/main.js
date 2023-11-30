//////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  main
//      top-level code for does-it-glider
//////////////////////////////////////////////////////////////////////

// Configuration
import { settings } from '/src/does-it-glider/settings.js'
import { d3_plus as d3 } from '/lib/d3-helper.js'

// WebGL modules
import { webgl_context } from '/src/mywebgl/render.js'

// Conway's Game of Life modules
import { apply_rules, add_seed } from '/src/conway/play.js'
import { new_grid } from '/src/conway/grid.js'

// does-it-glider modules
import { draw } from '/src/does-it-glider/draw.js'

// Init
// get query params
const urlParams = new URLSearchParams(window.location.search)
const version = urlParams.get('version') || urlParams.get('v') || 'stable'
const use_gl = version == 'beta' || version == 'both'
const use_svg = version == 'stable' || version == 'both'
// warn if using the beta version
if (use_gl) {
    console.warn(`Using Beta WebGL version.`)
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
    .style('flex-direction', (app_rect.width > app_rect.height) ? 'row' : 'column')

// top half
let svg_div = d3.select() // initialize to empty selection
let webgl_div = d3.select() // initialize to empty selection

if (use_svg) {
    svg_div = app.mynew('div.top')
        .style('background', '#000000ff') // out of bounds color
}

// bottom half    
if (use_gl) {
    webgl_div = app.mynew('div.bottom')
        .style('background', '#e600ffff') // should never see this
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
// max width reference: '##################################'
// abbove is max width on smallest mobile (iPhone SE)

touch_target.append('div')
    .attr('class', 'title')
    .html(_title)
    
touch_target.append('div')
    .attr('class', 'title sub-title')
    .html(_sub_title)

// make a gol field in the app DOM element
let field = d3.select()
if (use_svg) {
    field = new_grid(svg_div, settings.CELL_PX, settings.GRID_WIDTH, settings.GRID_HEIGHT)
}

// make a new 2D array the size of the 5x6 start pattern
let seed = []
// set the start pattern using life_seed format
seed[0] = '⬛⬛⬛⬛⬛'
seed[1] = '⬛⬛⬛⬛⬛'
seed[2] = '⬛⬛⬜⬛⬛'
seed[3] = '⬛⬛⬛⬜⬛'
seed[4] = '⬛⬜⬜⬜⬛'
seed[5] = '⬛⬛⬛⬛⬛'

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
seed = red_team.map((row, i) => row + 'o'.repeat(fight_paces) + blue_team[i])

seed.forEach((row, i) => {
    seed[i] = row
        .replace(/🟦/g, 'B')
        .replace(/🟥/g, 'R')
        .replace(/⬜/g, 'b')
        .replace(/⬛/g, 'o')
        .replace(/X/g, 'b')
        .replace(/\./g, 'o')
})

// get the width and height of the gol_field
let grid_h = settings.GRID_HEIGHT
let grid_w = settings.GRID_WIDTH
// make a new 2D array the size of the g element divide by 20px
let grid = Array.from({ length: grid_h }, () => Array.from({ length: grid_w }, () => 'o'))

// copy the start into the center of the state
add_seed(seed, grid)

let tick = 0
let num_ticks = Math.round(settings.BEAT / (1000 / 60)) // BEATmsec / (1000msec/60frame) ->  num_ticks has units of frame
num_ticks = Math.round(num_ticks / 4) // speed up to several frames per BEAT
let pause_for_new = Math.round(1.333 * 60)
const event_loop = () => {
    if (pause_for_new == 0) {    // apply the rules to the state
        if (tick % num_ticks == 0) { // only apply rules every num_ticks frames
            grid = apply_rules(grid)
        }
    } else {
        pause_for_new-- // HACK, there must be a better way to pause for new and also draw only n frames
    }
    draw(field, grid, settings.CELL_PX) // redraw every time for smooth pan and zoom
    tick++
    requestAnimationFrame(event_loop) // BUG this might fix issue #5. trying again
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
                .replace(/🟨|🟧/g, 'b') // hits in wrong location are red team
                .replace(/🟩|🟦/g, 'b') // hits in correct location are blue team
                .replace(/⬜|⬛/g, 'o')
                .replace(/X/g, 'b')
                .replace(/\./g, 'o')
        )
    )
    console.log(`life_seed:\n ${life_seed}`)

    let beat_pasted = settings.BEAT
    let beat_wordle_guesses = settings.BEAT
    let beat_life_seed = settings.BEAT
    // draw/render pasted_lines in the .paste-line divs
    const draw_pasted_lines = () => {
        console.log(`draw_pasted_lines()`)
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
                enter => enter.mynew('div').classed('paste-line', true),
                update => update,
                exit => exit
                    .remove()
            ) //join returns enter and update merged
            .html(d => d)
            .transition().duration(beat_wordle_guesses)
            .remove()
            .on('end', () => {
                console.log(`draw_wordle_guesses() end event`)
                draw_life_seed()
            })
    }

    const draw_life_seed = () => {
        console.log(`draw_life_seed()`)
        const transition = app
            .selectAll('.paste-line')
            .data(life_seed)
            .html(d => d)
            .transition().duration(beat_life_seed)
            .remove()
            .on('end', (a, b, c, d) => {
                console.log(`count these end events:\n${a}\n${b}\n${c}\n${d}`)
                load_new_state(life_seed || seed)
            }) // BUG #8 this transition ends for each line, I want to wait for the last
    }

    const load_new_state = (life_seed) => {
        console.time('load_new_state')

        // clear the state
        grid = Array.from({ length: grid_h }, () => Array.from({ length: grid_w }, () => 'o'))
        // copy the life_seed into the center of the state
        add_seed(life_seed, grid)
        pause_for_new = 2 * 60

        console.timeEnd('load_new_state')
    }

    draw_pasted_lines() // this function will chain to the next functions
    // ??? is there a better method that hooks into the end of the CSS animation instead of D3?
    // ??? if so, then am I using d3 for anything other than zoom transform or a fancier jquery?
    // draw_wordle_guesses()
    // draw_life_seed()
    // load_new_state(life_seed || start)
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
if (use_gl) {
    const gl = webgl_context(webgl_div)
}
