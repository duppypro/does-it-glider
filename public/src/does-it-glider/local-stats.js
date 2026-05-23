//////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, 2025 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider
//      local-stats
//////////////////////////////////////////////////////////////////////

const APP_UNIQUE_PREFIX = 'Interface_Arts_does-it-glider_duppy_v1.2025.09.21'
const VALIANT_ATTEMPTS_KEY = `${APP_UNIQUE_PREFIX}_unique_seed_hashes`
const LONGEST_LIVED_KEY = `${APP_UNIQUE_PREFIX}_max_gen_count`
const MAX_MATURE_GLIDERS_KEY = `${APP_UNIQUE_PREFIX}_max_glider_count`
const MAX_TRAGIC_FIZZLES_KEY = `${APP_UNIQUE_PREFIX}_max_failed_baby_count`
const MAX_STABLE_CYCLE_KEY = `${APP_UNIQUE_PREFIX}_max_stable_cycle`

export function hash_seed(seed_arr) {
    // Use joined string as the key
    return seed_arr.join('|')
}

let cached_seed_hashes = null
let cached_valiant_attempts = null
let cached_longest_lived = null
let cached_max_mature_gliders = null
let cached_max_tragic_fizzles = null
let cached_max_stable_cycle = null

export function get_seed_hashes() {
    if (cached_seed_hashes !== null) return cached_seed_hashes
    try {
        const stored = localStorage.getItem(VALIANT_ATTEMPTS_KEY)
        cached_seed_hashes = stored ? new Set(JSON.parse(stored)) : new Set()
    } catch (e) {
        cached_seed_hashes = new Set()
    }
    return cached_seed_hashes
}

export function add_seed_hash(hash) {
    const hashes = get_seed_hashes()
    if (!hashes.has(hash)) {
        hashes.add(hash)
        localStorage.setItem(VALIANT_ATTEMPTS_KEY, JSON.stringify(Array.from(hashes)))
        cached_valiant_attempts = hashes.size
    }
}

export function get_valiant_attempts() {
    if (cached_valiant_attempts !== null) return cached_valiant_attempts
    cached_valiant_attempts = get_seed_hashes().size
    return cached_valiant_attempts
}

export function get_longest_lived() {
    if (cached_longest_lived !== null) return cached_longest_lived
    cached_longest_lived = Number(localStorage.getItem(LONGEST_LIVED_KEY) || '0')
    return cached_longest_lived
}

export function set_longest_lived(count) {
    cached_longest_lived = count
    localStorage.setItem(LONGEST_LIVED_KEY, String(count))
}

export function get_max_stable_cycle() {
    if (cached_max_stable_cycle !== null) return cached_max_stable_cycle
    cached_max_stable_cycle = Number(localStorage.getItem(MAX_STABLE_CYCLE_KEY) || '0')
    return cached_max_stable_cycle
}

export function set_max_stable_cycle(count) {
    cached_max_stable_cycle = count
    localStorage.setItem(MAX_STABLE_CYCLE_KEY, String(count))
}

export function get_max_mature_gliders() {
    if (cached_max_mature_gliders !== null) return cached_max_mature_gliders
    cached_max_mature_gliders = Number(localStorage.getItem(MAX_MATURE_GLIDERS_KEY) || '0')
    return cached_max_mature_gliders
}

export function set_max_mature_gliders(count) {
    cached_max_mature_gliders = count
    localStorage.setItem(MAX_MATURE_GLIDERS_KEY, String(count))
}

export function get_max_tragic_fizzles() {
    if (cached_max_tragic_fizzles !== null) return cached_max_tragic_fizzles
    cached_max_tragic_fizzles = Number(localStorage.getItem(MAX_TRAGIC_FIZZLES_KEY) || '0')
    return cached_max_tragic_fizzles
}

export function set_max_tragic_fizzles(count) {
    cached_max_tragic_fizzles = count
    localStorage.setItem(MAX_TRAGIC_FIZZLES_KEY, String(count))
}

export function reset_stats() {
    localStorage.removeItem(VALIANT_ATTEMPTS_KEY)
    localStorage.removeItem(LONGEST_LIVED_KEY)
    localStorage.removeItem(MAX_MATURE_GLIDERS_KEY)
    localStorage.removeItem(MAX_TRAGIC_FIZZLES_KEY)
    localStorage.removeItem(MAX_STABLE_CYCLE_KEY)
    cached_valiant_attempts = null
    cached_seed_hashes = null
    cached_longest_lived = null
    cached_max_mature_gliders = null
    cached_max_tragic_fizzles = null
    cached_max_stable_cycle = null
}
