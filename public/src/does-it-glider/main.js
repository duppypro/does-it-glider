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
import { GameState } from './game-state.js'
import { PerformanceMonitor } from './performance-monitor.js'

//
// Create the mostly static DOM elements for does-it-glider app
//

// Find the top app div by unique ID
const app_sel = d3.select('#does-it-glider-app')

// Create the title    
const _title = 'Does it Glider?'
const _sub_title = 'Tap here to paste Wordle score.'

const touch_target_sel = app_sel.append('span').classed('touch-target', true)
touch_target_sel.append('div').classed('title', true)
    .html(_title)
touch_target_sel.append('div').classed('title sub-title', true)
    .html(_sub_title)

// Create the stats display
const stats_sel = app_sel.append('span').classed('stats', true)

const controls_sel = stats_sel.append('div').classed('controls', true)
const pause_btn_sel = controls_sel.append('button')
    .classed('pause-btn', true)
    .html('PAUSE')
    .on('click', () => {
        const is_paused = game_state.toggle_pause()
        pause_btn_sel.html(is_paused ? 'PLAY' : 'PAUSE')
    })

const step_btn_sel = controls_sel.append('button')
    .classed('pause-btn', true)
    .html('STEP')
    .on('click', () => {
        if (!game_state.is_paused) {
            game_state.is_paused = true
            pause_btn_sel.html('PLAY')
        }
        game_state.tick(game_state.msec_per_gen, true)
        draw_frame()
        draw_gen_count()
        draw_glider_count()
    })

const gen_count_sel = stats_sel.append('div').classed('gen-count', true)
    .html('----')
const seed_count_sel = stats_sel.append('div').classed('seed-count', true)
    .html('Seeds submitted: -')
const max_gen_count_sel = stats_sel.append('div').classed('max-gen-count', true)
     .html('Max generations: ----')
const glider_count_sel = stats_sel.append('div').classed('glider-count', true)
     .html('Gliders detected: --')
const max_glider_count_sel = stats_sel.append('div').classed('max-glider-count', true)
     .html('Max gliders: --')

// get the width and height of the grid and screen size parameters
const line_height = Math.max(12, touch_target_sel.select('.sub-title').node().clientHeight)
let {
    GRID_HEIGHT, GRID_WIDTH, CELL_PX,
    NEW_PAUSE_MSEC, MSEC_PER_BEAT,
} = dig.settings

// make a grid in the app DOM element
const grid_sel = dig.append_grid(app_sel, CELL_PX, GRID_WIDTH, GRID_HEIGHT)

// Initialize Game State
const game_state = new GameState(GRID_WIDTH, GRID_HEIGHT, dig.settings)
const perf_monitor = new PerformanceMonitor()

const attract_seed = dig.seeds.glider 

let prior_max_gen_count = local_stats.get_max_gen_count() || 0
let prior_max_glider_count = local_stats.get_max_glider_count() || 0
const msec_per_tick = 1000.0 / 60.0 
let beat_pasted = MSEC_PER_BEAT
let seed = [] 

const event_loop = () => {
    draw_frame()

    const was_stable = game_state.is_stable
    const gen_advanced = game_state.tick(msec_per_tick)

    if (gen_advanced) {
        draw_gen_count()
        draw_glider_count()
        
        if (game_state.gen_count > prior_max_gen_count) {
            prior_max_gen_count = game_state.gen_count
            local_stats.set_max_gen_count(prior_max_gen_count)
            draw_max_gen_count()
        }

        const current_glider_count = game_state.glider_id_counter - 1
        if (current_glider_count > prior_max_glider_count) {
            prior_max_glider_count = current_glider_count
            local_stats.set_max_glider_count(prior_max_glider_count)
            draw_max_glider_count()
        }
    }

    if (!was_stable && game_state.is_stable) {
        console.log("🏁 Simulation stabilized.")
        // Final UI update
        draw_gen_count()
    }

    requestAnimationFrame(event_loop)
}

const load_new_seed = (new_seed) => {
    game_state.load_new_seed(new_seed)
    
    // Update local stats for every seed load (including attract/injected)
    const hash = local_stats.hash_seed(new_seed)
    local_stats.add_seed_hash(hash)
    draw_seed_count()
    
    draw_gen_count()
    draw_glider_count()
}

function draw_gen_count() {
    gen_count_sel.html(`${game_state.gen_count}`.padStart(4, '0'))
}

function draw_frame() {
    dig.draw(
        grid_sel,
        game_state.live_cells,
        CELL_PX, 
        d3.easeQuadOut(1.0 - game_state.new_pause_countdown / NEW_PAUSE_MSEC)
    )
}

function draw_seed_count() {
    const count = local_stats.get_seed_count()
    seed_count_sel.html(`Seeds submitted: ${count}`)
}

function draw_max_gen_count() {
    const count = local_stats.get_max_gen_count()
    max_gen_count_sel.html(`Max generations: ${count}`)
}    

function draw_max_glider_count() {
    const count = local_stats.get_max_glider_count()
    max_glider_count_sel.html(`Max gliders: ${count}`)
}

function draw_glider_count() {
    glider_count_sel.html(`Gliders detected: ${game_state.glider_id_counter - 1}`)
}

const parse_clipboard = (pasted_clipboard) => {
    let pasted_lines = []
    pasted_lines = pasted_clipboard.replace(/\$|!/ug, '\n') 
    pasted_lines = pasted_lines.split(/\r\n|\r|\n/ug) 
    pasted_lines = pasted_lines.slice(0, 24) 

    let guesses = []
    guesses = pasted_lines.map(line => {
        line = line.trim()
        const guess = line.match(/^(⬜|🟨|🟩|⬛|🟦|🟧|o|b|R|B){5}$/u)
        return guess && guess[0] || ''    })

    const text_line_to_seed_line = (line) => {
        if (!line) return line
        return Array.from(line).map(char => {
            switch (char) {
                case '⬜': 
                case '⬛': 
                case 'b':  
                    return '⬛'
                case '🟨': 
                case '🟧': 
                case '🟩': 
                case '🟦': 
                case 'o':  
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
    guesses.forEach(guess => { 
        guess = text_line_to_seed_line(guess)
        if (guess?.length) {
            seed.push(guess)
        }
    })
    seed = seed.slice(0, 6) 

    const draw_clipboard_lines = () => {
        const last_line = pasted_lines.length - 1
        const ch = app_sel.node().clientHeight
        pasted_lines.reverse() 
        app_sel
            .selectAll('.paste-line')
            .data(pasted_lines)
            .join(
                enter => enter.append('div').classed('paste-line', true)
                    .style('position', 'absolute')
                    .style('background-color', '#00000000')
                    .style('opacity', 1)
                    .style('transform', 'scale(1)')
                    .style('top', (_d, i) => `${-(i + 1) * line_height}px`) 
                    .style('text-align', 'center'),
                update => update,
                exit => exit.remove()
            )
            .html(line => line || '&nbsp;')
            .transition().duration((_d, i) => beat_pasted)
            .delay((_d, i) => i * beat_pasted / 4) 
            .ease(d3.easePolyIn.exponent(3))
            .style('top', (_d, i) => {
                const top = `${ch * 1 / 2 - (i - 2) * line_height}px`
                return top
            })
            .transition().delay((_d, i) => (last_line - i) * beat_pasted / 4)
            .on('end', (_d, i) => {
                if (i == last_line) {
                    dig.clear_grid(game_state.current_grid)
                    dig.zoom_grid(0, 0, 1) 
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
} 

const get_clipboard_text = (event) => {
    event.preventDefault()
    navigator.clipboard.readText()
        .then(parse_clipboard)
        .catch(() => { /* no-op */ })
}

draw_gen_count()
draw_seed_count()
draw_max_gen_count()
draw_glider_count()
draw_max_glider_count()
load_new_seed(attract_seed)

// Diagnostic Bridge
window.dig_debug_draw = draw_frame
window.dig_debug = {
    game_state,
    perf_monitor,
    get_grid_hash: () => {
        return game_state.current_grid.map(row => row.join('')).join('\n').length
    },
    get_rect_count: () => {
        return document.querySelectorAll('rect.cell').length
    },
    step: () => {
        game_state.tick(game_state.msec_per_gen, true) 
        draw_frame()
        draw_gen_count()
    },
    run_perf_test: async (num_gens = 250) => {
        return await perf_monitor.run_test(game_state, grid_sel, num_gens)
    },
    inject_text_seed: (text) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
        
        // Helper to normalize emojis (same logic as parse_clipboard)
        const normalized = lines.map(line => {
            return Array.from(line).map(char => {
                switch (char) {
                    case '⬜': case '⬛': case 'b': return '⬛'
                    case '🟨': case '🟧': case '🟩': case '🟦': case 'o': return '⬜'
                    case 'R': return '🟥'
                    case 'B': return '🟦'
                    default: return char
                }
            }).join('')
        })

        load_new_seed(normalized)
        // Explicitly clear the intro pause for testing/benchmarking
        game_state.new_pause_countdown = 0
    },
    run_official_baselines: async () => {
        const GOLD_STANDARD = {
            p1751: { avg_gen_ms: 4.8000, dom_created: 8062 },
            p1750: { avg_gen_ms: 8.3442, dom_created: 59102 }
        }

        const p1 = `⬛⬛⬛⬛⬛\n⬛🟨⬛🟨⬛\n⬛🟩🟨⬛⬛\n🟩🟩⬛🟩⬛\n🟩🟩⬛🟩🟩\n🟩🟩🟩🟩🟩`
        const p2 = `🟨⬛⬛🟨⬛\n🟩⬛🟨⬛⬛\n🟩🟩🟩🟩🟩`
        
        console.log("--- STARTING OFFICIAL BASELINE SUITE ---")
        
        window.dig_debug.inject_text_seed(p1)
        const r1 = await window.dig_debug.run_perf_test(250)
        
        const delta1 = {
            time_delta: (r1.avg_gen_ms - GOLD_STANDARD.p1751.avg_gen_ms).toFixed(4),
            dom_delta: r1.dom_created - GOLD_STANDARD.p1751.dom_created
        }
        console.log("Baseline 1751 Delta:", delta1)

        // Brief pause between tests
        await new Promise(r => setTimeout(r, 500))
        
        window.dig_debug.inject_text_seed(p2)
        const r2 = await window.dig_debug.run_perf_test(1250)

        const delta2 = {
            time_delta: (r2.avg_gen_ms - GOLD_STANDARD.p1750.avg_gen_ms).toFixed(4),
            dom_delta: r2.dom_created - GOLD_STANDARD.p1750.dom_created
        }
        console.log("Baseline 1750 Delta:", delta2)
        
        return { 
            baseline_1751: { ...r1, ...delta1 }, 
            baseline_1750: { ...r2, ...delta2 } 
        }
    },
    reset_stats: () => {
        local_stats.reset_stats()
        prior_max_gen_count = 0
        prior_max_glider_count = 0
        game_state.glider_id_counter = 1 
        game_state.active_gliders = []
        draw_seed_count()
        draw_max_gen_count()
        draw_glider_count()
        draw_max_glider_count()
        console.log("📈 Stats reset successfully.")
    },
    // Programmatic test for rainbow animation
    test_rainbow: () => {
        const glider_cells = document.querySelectorAll('.party-glider')
        if (glider_cells.length === 0) return "No gliders found to test."
        
        const colors = []
        let samples = 0
        const interval = setInterval(() => {
            const color = window.getComputedStyle(glider_cells[0]).fill
            colors.push(color)
            if (++samples > 20) {
                clearInterval(interval)
                const unique = new Set(colors).size
                console.log(`Rainbow Test: Sampled ${samples} frames, found ${unique} unique colors.`)
                if (unique > 1) console.log("✅ Rainbow is cycling!")
                else console.error("❌ Rainbow is stuck!")
            }
        }, 100)
    }
}

event_loop() 

touch_target_sel.on('click', get_clipboard_text)
