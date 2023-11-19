////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  does it glider
//      main
////////////////////////////////////////////////////////////////////////////////

// I asked Copilot:
// "add a method to d3 selection that parses a selector string such as 'foo#name.c1.c2' and calls .append('foo').attr('class', 'c1 c2')"
// it generated the following code and added the id correctly even though I skipped it from the description.
d3.selection.prototype.appendParsed = function(selector) {
    var match = selector.match(/^(\w+)(?:#([\w-]+))?(?:\.([\w-.]+))?$/);
    if (!match) {
        throw new Error('Invalid selector');
    }

    var tag = match[1];
    var id = match[2];
    var classes = match[3];

    var selection = this.append(tag);

    if (id) {
        selection.attr('id', id);
    }

    if (classes) {
        selection.attr('class', classes.replace(/\./g, ' '));
    }

    return selection;
}

import {grid} from '/src/conway/grid.js'
import {apply_rules, set_state} from '/src/conway/play.js'
import {draw} from '/src/does-it-glider/draw.js'

// Configuration
let beat = (60 * 1000) / 180 // 180bpm for animations, units are in msec

// initialize
const app = d3.select('.does-it-glider-app')

// Create the title
let touch_target = app.append('span')
    .classed('touch-target', true)

const _title =                 'Does it Glider?'
const _sub_title =      'Tap here to paste Wordle score.'
// max width reference: '##################################'
// abbove is max width on smallest mobile (iPhone SE)

touch_target.append('div')
    .attr('class', 'title')
    .html(_title)
touch_target.append('div')
    .attr('class', 'title sub-title')
    .html(_sub_title)

// make a gol field in the app DOM element
const field = grid(app)

// make a new 2D array the size of the 5x6 start pattern
let start = []
// set the start pattern using life_seed format
start[0] = '⬛⬛⬛⬛⬛'
start[1] = '⬛⬛⬛⬛⬛'
start[2] = '⬛⬛🟦⬛⬛'
start[3] = '⬛⬛⬛🟦⬛'
start[4] = '⬛B🟥🟥⬛'
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

let fight_paces = 5
// join red team and blue team into start with red team on left and fight_paces dead cells in between
start = red_team.map((row, i) => row + 'o'.repeat(fight_paces) + blue_team[i])
// start = blue_team.map((row, i) => row + 'ooooo' + red_team[i])

start.forEach((row, i) => {
    start[i] = row
        .replace(/🟦/g,'B')
        .replace(/🟥/g,'R')
        .replace(/⬜/g,'b')
        .replace(/⬛/g,'o')
})

// get the width and height of the gol_field
let field_h = field.node().getBoundingClientRect().height
let field_w = field.node().getBoundingClientRect().width
// divide field_h and field_w by 20px and round to int
field_h = Math.round(field_h / 20)
field_w = Math.round(field_w / 20)
// make a new 2D array the size of the g element divide by 20px
let state = Array.from({length: field_h}, () => Array.from({length: field_w}, () => 'o'))

// copy the start into the center of the state
set_state(start, state)

// render start as a 2D array of rects in the svg
draw(field, state)


// run the game of life
// call apply_rules() and draw() every beat msecs
setInterval(() => {
    // apply the rules to the state
    state = apply_rules(state)
    // draw the state smoothly before next animation frame
    // requestAnimationFrame(draw.bind(null, field, state))
    // don't call requestAnimationFrame() inside setInterval() callback
    draw(field, state)
}, beat/4)

let life_seed = []

// // d3.select('body').on('paste', event => {
// d3.selectAll('.touch-target').on('drag', e => {
//     console.log('drag event blocked')
//     e.stopPropagation()
//     e.preventDefault()
// })
// d3.selectAll('.touch-target').on('zoom', e => {
//     console.log('zoom event blocked')
//     e.stopPropagation()
//     e.preventDefault()
// })
// d3.selectAll('.touch-target').on('scroll', e => {
//     console.log('scroll event blocked')
//     e.stopPropagation()
//     e.preventDefault()
// })

const get_clipboard = (pasted_clipboard) => {
    console.log('click event heard')

    let pasted_lines = []
    console.log(`pasted_clipboard:\r\n${pasted_clipboard}`)
    pasted_lines = pasted_clipboard.split(/\r\n|\r|\n/ug)
    console.log(`split lines: ${pasted_lines}`)

    // filter pasted_lines for only lines that are length 5
    // and contain only '⬜', '🟨', '🟩', or '⬛'
    let wordle_guesses = []
    wordle_guesses = pasted_lines
        .filter(line => line.match(/^(⬜|🟨|🟩|⬛|🟦|🟧|o|b|R|B)+$/ug))
    // this is only lines with exactly 5 wordle squares
    console.log(`filtered wordle_guesses: ${wordle_guesses}`)

    // convert all '🟨'|'🟩' in wordle_guesses to '⬜' and '⬜'|'⬛' to '⬛'
    life_seed = []
    wordle_guesses.map(guess =>
        life_seed.push(
            guess
                // need an intermediate character to avoid double replacement
                // try red team 🟥 blue team 🟦 fight idea
                .replace(/🟨|🟧/g,'R') // hits in wrong location are red team
                .replace(/🟩|🟦/g,'B') // hits in correct location are blue team
                .replace(/⬜|⬛/g,'o')
        )
    )
    console.log(`life_seed: ${life_seed}`)

    let beat_pasted = beat
    let beat_wordle_guesses = beat
    let beat_life_seed = beat
    // draw/render pasted_lines in the .paste-line divs
    const draw_pasted_lines = async () => {
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

        await transition.end()

        draw_wordle_guesses()
    }

    const draw_wordle_guesses = async () => {
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
            
        await transiton.end()

        load_new_state(life_seed || start)
        draw_life_seed()
    }
        
    const draw_life_seed = async () => {
        const transition = app
            .selectAll('.paste-line')
            .data(life_seed)
            .html(d => d)
            .transition().duration(beat_life_seed)
            .remove()

        await transition.end()   
    }
    
    const load_new_state = (life_seed) => {
        // log time of event
        console.log(`Enter load_new_state: ${new Date().getTime()}`)
        // clear the state
        state = Array.from({length: field_h}, () => Array.from({length: field_w}, () => 'o'))
        // copy the life_seed into the center of the state
        set_state(life_seed, state)
        draw(field, state) // TODO: is this needed or does the next setInterval() call draw()? Should make it pause on initial seed for a few seconds.
    }
        
    draw_pasted_lines()
    // draw_wordle_guesses()
    // load_new_state(life_seed || start)
    // draw_life_seed()
} // end get_clipboard()

d3.select('.touch-target').on('click', event => {
    event.preventDefault()
    navigator.clipboard.readText().then(get_clipboard)
})
