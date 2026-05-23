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

const stats_grid = stats_sel.append('div').classed('stats-grid', true)

// Valiant Attempts (Top Row, No Max)
const attempts_row = stats_grid.append('div').classed('stat-row', true)
attempts_row.append('div').classed('stat-label', true).html('Valiant Attempts:')
const valiant_attempts_sel = attempts_row.append('div').classed('stat-current', true).html('0000')
attempts_row.append('div').classed('stat-max', true).html('')

// Header
stats_grid.append('div')
stats_grid.append('div').classed('stat-header stat-header-live', true).html('LIVE')
stats_grid.append('div').classed('stat-header stat-header-max', true).html('PERSONAL<br>MAX')

// Longest Lived (Generations)
const gen_row = stats_grid.append('div').classed('stat-row', true)
gen_row.append('div').classed('stat-label', true).html('Longest Lived:')
const gen_count_sel = gen_row.append('div').classed('stat-current', true).html('0000')
const max_gen_count_sel = gen_row.append('div').classed('stat-max', true).html('0000')

// Stable Cycle Length
const cycle_row = stats_grid.append('div').classed('stat-row', true)
cycle_row.append('div').classed('stat-label', true).html('Stable Cycle Length:')
const cycle_count_sel = cycle_row.append('div').classed('stat-current', true).html('0000')
const max_cycle_count_sel = cycle_row.append('div').classed('stat-max', true).html('0000')

// Mature Gliders
const mature_row = stats_grid.append('div').classed('stat-row', true)
mature_row.append('div').classed('stat-label', true).html('Mature Gliders:')
const mature_gliders_sel = mature_row.append('div').classed('stat-current', true).html('0000')
const max_mature_gliders_sel = mature_row.append('div').classed('stat-max', true).html('0000')

// Tragic Fizzles
const fizzle_row = stats_grid.append('div').classed('stat-row', true)
fizzle_row.append('div').classed('stat-label', true).html('Tragic Fizzles:')
const tragic_fizzles_sel = fizzle_row.append('div').classed('stat-current', true).html('0000')
const max_tragic_fizzles_sel = fizzle_row.append('div').classed('stat-max', true).html('0000')

// get the width and height of the grid and screen size parameters
const line_height = Math.max(12, touch_target_sel.select('.sub-title').node().clientHeight)
let {
    GRID_HEIGHT, GRID_WIDTH, CELL_PX,
    NEW_PAUSE_MSEC, MSEC_PER_BEAT,
} = dig.settings

// make a grid in the app DOM element
const grid_sel = dig.append_grid(app_sel, CELL_PX, GRID_WIDTH, GRID_HEIGHT)

// Update SVG dimensions and zoom extent whenever the viewport changes
// (phone rotation, split-screen, external display, desktop window resize).
// Using ResizeObserver on the app element is more reliable than window 'resize'
// because it fires for all layout-driven size changes, not just window events.
// Debounced to avoid excessive recalculations during continuous resize drags.
let _resize_timer = null
const resize_observer = new ResizeObserver(() => {
    clearTimeout(_resize_timer)
    _resize_timer = setTimeout(() => { dig.resize_grid() }, 100)
})
resize_observer.observe(app_sel.node())

// Initialize Game State
const game_state = new GameState(GRID_WIDTH, GRID_HEIGHT, dig.settings)
const perf_monitor = new PerformanceMonitor()

const attract_seed = dig.seeds.glider 

let prior_longest_lived = local_stats.get_longest_lived() || 0
let prior_max_stable_cycle = local_stats.get_max_stable_cycle() || 0
let prior_max_mature_gliders = local_stats.get_max_mature_gliders() || 0
let prior_max_tragic_fizzles = local_stats.get_max_tragic_fizzles() || 0
const msec_per_tick = 1000.0 / 60.0 
let beat_pasted = MSEC_PER_BEAT
let seed = [] 

function trigger_stat_animation(selection) {
    const flash_duration = 1000 // 1 second
    selection.node().flash_until = performance.now() + flash_duration
}

const event_loop = () => {
    draw_frame()

    const was_stable = game_state.is_stable
    const prev_mature = game_state.mature_gliders_count
    const prev_fizzles = game_state.tragic_fizzles_count
    const gen_advanced = game_state.tick(msec_per_tick)

    if (gen_advanced) {
        draw_gen_count()
        draw_mature_gliders()
        draw_tragic_fizzles()
        
        if (game_state.gen_count > prior_longest_lived) {
            prior_longest_lived = game_state.gen_count
            local_stats.set_longest_lived(prior_longest_lived)
            draw_longest_lived()
            trigger_stat_animation(gen_row)
        }

        if (was_stable === false && game_state.is_stable === true) {
            draw_stable_cycle()
            if (game_state.stable_cycle_length > prior_max_stable_cycle) {
                prior_max_stable_cycle = game_state.stable_cycle_length
                local_stats.set_max_stable_cycle(prior_max_stable_cycle)
                draw_max_stable_cycle()
                trigger_stat_animation(cycle_row)
            }
        }

        if (game_state.mature_gliders_count > prev_mature) {
            draw_mature_gliders()
            trigger_stat_animation(mature_row)
            
            if (game_state.mature_gliders_count > prior_max_mature_gliders) {
                prior_max_mature_gliders = game_state.mature_gliders_count
                local_stats.set_max_mature_gliders(prior_max_mature_gliders)
                draw_max_mature_gliders()
                trigger_stat_animation(mature_row)
            }
        }

        if (game_state.tragic_fizzles_count > prev_fizzles) {
            draw_tragic_fizzles()
            trigger_stat_animation(fizzle_row)
            
            if (game_state.tragic_fizzles_count > prior_max_tragic_fizzles) {
                prior_max_tragic_fizzles = game_state.tragic_fizzles_count
                local_stats.set_max_tragic_fizzles(prior_max_tragic_fizzles)
                draw_max_tragic_fizzles()
                trigger_stat_animation(fizzle_row)
            }
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
    draw_valiant_attempts()
    
    draw_gen_count()
    draw_mature_gliders()
    draw_tragic_fizzles()
}

function format_num(num) {
    if (num === null || num === undefined) return '----'
    return String(num).padStart(4, ' ')
}

function draw_gen_count() {
    gen_count_sel.html(format_num(game_state.gen_count))
}

function draw_stable_cycle() {
    cycle_count_sel.html(format_num(game_state.stable_cycle_length))
}

function draw_max_stable_cycle() {
    const count = local_stats.get_max_stable_cycle()
    max_cycle_count_sel.html(format_num(count))
}

function draw_frame() {
    dig.draw(
        grid_sel,
        game_state.live_cells,
        CELL_PX, 
        d3.easeQuadOut(1.0 - game_state.new_pause_countdown / NEW_PAUSE_MSEC)
    )

    // Handle frame-synced D3 rainbow animations for stats
    const now = performance.now()
    stats_grid.selectAll('.stat-row').each(function() {
        const row = d3.select(this)
        const flash_until = this.flash_until || 0
        
        if (now < flash_until) {
            // Cycle 2 times over 1000ms
            const phase = ((now % 500) / 500)
            row.style('color', d3.interpolateRainbow(phase))
               .style('font-weight', 'bold')
        } else {
            row.style('color', null)
               .style('font-weight', null)
        }
    })
}

function draw_valiant_attempts() {
    const count = local_stats.get_valiant_attempts()
    valiant_attempts_sel.html(format_num(count))
}

function draw_longest_lived() {
    const count = local_stats.get_longest_lived()
    max_gen_count_sel.html(format_num(count))
}    

function draw_max_mature_gliders() {
    const count = local_stats.get_max_mature_gliders()
    max_mature_gliders_sel.html(format_num(count))
}

function draw_mature_gliders() {
    mature_gliders_sel.html(format_num(game_state.mature_gliders_count))
}

function draw_tragic_fizzles() {
    tragic_fizzles_sel.html(format_num(game_state.tragic_fizzles_count))
}

function draw_max_tragic_fizzles() {
    const count = local_stats.get_max_tragic_fizzles()
    max_tragic_fizzles_sel.html(format_num(count))
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

draw_valiant_attempts()
draw_gen_count()
draw_longest_lived()
draw_stable_cycle()
draw_max_stable_cycle()
draw_mature_gliders()
draw_max_mature_gliders()
draw_tragic_fizzles()
draw_max_tragic_fizzles()
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
            p1751: { expected_gens: 190, expected_mature: 0, expected_fizzles: 0, expected_cycle: 2 },
            p1750: { expected_gens: 1188, expected_mature: 11, expected_fizzles: 8, expected_cycle: 2 }
        }

        const p1 = `⬛⬛⬛⬛⬛\n⬛🟨⬛🟨⬛\n⬛🟩🟨⬛⬛\n🟩🟩⬛🟩⬛\n🟩🟩⬛🟩🟩\n🟩🟩🟩🟩🟩`
        const p2 = `🟨⬛⬛🟨⬛\n🟩⬛🟨⬛⬛\n🟩🟩🟩🟩🟩`
        
        console.log("--- STARTING OFFICIAL BASELINE SUITE ---")
        
        const assert_baseline = (name, result, expected) => {
            let pass = true
            if (result.num_gens !== expected.expected_gens) {
                console.error(`❌ ${name} failed: Expected ${expected.expected_gens} gens, got ${result.num_gens}`)
                pass = false
            }
            if (result.mature_gliders_detected !== expected.expected_mature) {
                console.error(`❌ ${name} failed: Expected ${expected.expected_mature} mature gliders, got ${result.mature_gliders_detected}`)
                pass = false
            }
            if (result.tragic_fizzles !== expected.expected_fizzles) {
                console.error(`❌ ${name} failed: Expected ${expected.expected_fizzles} fizzles, got ${result.tragic_fizzles}`)
                pass = false
            }
            if (result.stable_cycle_length !== expected.expected_cycle) {
                console.error(`❌ ${name} failed: Expected cycle length ${expected.expected_cycle}, got ${result.stable_cycle_length}`)
                pass = false
            }
            if (pass) {
                console.log(`✅ ${name} passed all assertions! (Took ${result.total_time_ms}ms, Avg: ${result.avg_gen_ms}ms/gen)`)
            }
        }

        window.dig_debug.inject_text_seed(p1)
        const r1 = await window.dig_debug.run_perf_test(9999)
        assert_baseline("Baseline 1751", r1, GOLD_STANDARD.p1751)

        // Brief pause between tests
        await new Promise(r => setTimeout(r, 500))
        
        window.dig_debug.inject_text_seed(p2)
        const r2 = await window.dig_debug.run_perf_test(9999)
        assert_baseline("Baseline 1750", r2, GOLD_STANDARD.p1750)

        return { baseline_1751: r1, baseline_1750: r2 }
    },
    reset_stats: () => {
        local_stats.reset_stats()
        prior_longest_lived = 0
        prior_max_stable_cycle = 0
        prior_max_mature_gliders = 0
        prior_max_tragic_fizzles = 0
        game_state.glider_id_counter = 1 
        game_state.mature_gliders_count = 0
        game_state.tragic_fizzles_count = 0
        game_state.active_gliders = []
        draw_valiant_attempts()
        draw_gen_count()
        draw_longest_lived()
        draw_stable_cycle()
        draw_max_stable_cycle()
        draw_mature_gliders()
        draw_max_mature_gliders()
        draw_tragic_fizzles()
        draw_max_tragic_fizzles()
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
    },
    dump_gliders: () => {
        const gliders = game_state.active_gliders
        if (gliders.length === 0) return "No active gliders."
        
        let out = `Gen ${game_state.gen_count} | Active Gliders: ${gliders.length}\n`
        gliders.forEach(g => {
            out += `\nGlider ID ${g.id} at x:${g.x}, y:${g.y} (Phase ${g.phase})\n`
            // Print a 7x7 grid around the 5x5 detection bounding box
            for (let y = g.y - 1; y <= g.y + 5; y++) {
                let row = ""
                for (let x = g.x - 1; x <= g.x + 5; x++) {
                    if (y < 0 || y >= game_state.grid_height || x < 0 || x >= game_state.grid_width) {
                        row += '🧱'
                    } else {
                        row += game_state.current_grid[y][x] === '⬛' ? '⬛' : '⬜'
                    }
                }
                out += row + '\n'
            }
        })
        console.log(out)
        return "Copy the text above and paste it in the chat!"
    }
}

event_loop() 

touch_target_sel.on('click', get_clipboard_text)
