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

    stop_dom_observation() {
        if (this.observer) {
            this.observer.disconnect()
            this.observer = null
        }
    }

    /**
     * Runs a performance test for a fixed number of generations.
     * @param {GameState} game_state 
     * @param {number} num_gens - Default 200
     * @returns {Promise<Object>} - The test results
     */
    async run_test(game_state, num_gens = 200) {
        console.log(`🚀 Starting performance test for ${num_gens} generations...`)
        
        // Ensure we are observing the correct node
        const grid_node = document.querySelector('#does-it-glider-app svg g')
        if (!grid_node) throw new Error("Grid node not found")
        
        this.start_dom_observation(grid_node)

        const start_time = performance.now()
        
        // We use a loop to tick the state without waiting for requestAnimationFrame
        // This measures the pure computational speed of the rules + draw calls
        for (let i = 0; i < num_gens; i++) {
            // Force a tick regardless of pause/timers
            game_state.tick(game_state.msec_per_gen, true)
            
            // Trigger the draw manually for the test
            // We need to reach back into the global scope or pass dependencies
            // For now, we'll assume 'window.dig_debug_draw' exists (added in next step)
            if (window.dig_debug_draw) {
                window.dig_debug_draw()
            }
        }

        const end_time = performance.now()
        this.stop_dom_observation()

        const total_time = end_time - start_time
        const result = {
            num_gens,
            total_time_ms: total_time.toFixed(2),
            avg_gen_ms: (total_time / num_gens).toFixed(4),
            dom_created: this.dom_stats.created,
            dom_removed: this.dom_stats.removed,
            final_rect_count: document.querySelectorAll('rect.cell').length
        }

        console.table(result)
        this.results.push(result)
        return result
    }
}
