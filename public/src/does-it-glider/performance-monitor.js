//////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, 2025 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider
//      performance-monitor
//////////////////////////////////////////////////////////////////////

/**
 * PerformanceMonitor tracks execution time and DOM churn.
 */
export class PerformanceMonitor {
    constructor() {
        this.results = []
        this.observer = null
        this.dom_stats = {
            created: 0,
            removed: 0
        }
    }

    /**
     * Starts observing DOM mutations in the SVG grid.
     * @param {HTMLElement} target_node - The SVG group containing cells.
     */
    start_dom_observation(target_node) {
        this.dom_stats = { created: 0, removed: 0 }
        
        if (this.observer) this.observer.disconnect()

        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                this.dom_stats.created += mutation.addedNodes.length
                this.dom_stats.removed += mutation.removedNodes.length
            }
        })

        this.observer.observe(target_node, { childList: true })
    }

    /**
     * Processes any pending mutations that haven't been delivered to the callback yet.
     */
    _flush() {
        if (this.observer) {
            const records = this.observer.takeRecords()
            for (const mutation of records) {
                this.dom_stats.created += mutation.addedNodes.length
                this.dom_stats.removed += mutation.removedNodes.length
            }
        }
    }

    stop_dom_observation() {
        if (this.observer) {
            this._flush()
            this.observer.disconnect()
            this.observer = null
        }
    }

    /**
     * Runs a performance test for a fixed number of generations.
     * @param {GameState} game_state 
     * @param {d3.Selection} grid_sel - The D3 selection of the grid.
     * @param {number} num_gens - Default 200
     * @returns {Promise<Object>} - The test results
     */
    async run_test(game_state, grid_sel, num_gens = 200) {
        const start_gen = game_state.gen_count
        console.log(`🚀 Starting performance test for ${num_gens} generations...`)
        
        const grid_node = grid_sel.node()
        if (!grid_node) throw new Error("Grid node not found")
        
        this.start_dom_observation(grid_node)
        console.log(`🧐 Monitoring node: <${grid_node.tagName}> with class "${grid_node.className.baseVal || grid_node.className}"`)

        const start_time = performance.now()
        
        for (let i = 0; i < num_gens; i++) {
            game_state.tick(game_state.msec_per_gen, true)
            if (window.dig_debug_draw) {
                window.dig_debug_draw()
            }
        }

        const end_time = performance.now()
        this.stop_dom_observation()

        const total_time = end_time - start_time
        const result = {
            start_gen,
            end_gen: game_state.gen_count,
            num_gens: game_state.gen_count - start_gen,
            total_time_ms: total_time.toFixed(2),
            avg_gen_ms: (total_time / num_gens).toFixed(4),
            dom_created: this.dom_stats.created,
            dom_removed: this.dom_stats.removed,
            final_rect_count: document.querySelectorAll('rect.cell').length,
            adult_gliders_detected: game_state.adult_gliders_count,
            failed_baby_gliders: game_state.failed_baby_gliders_count
        }

        console.table(result)
        this.results.push(result)
        return result
    }
}
