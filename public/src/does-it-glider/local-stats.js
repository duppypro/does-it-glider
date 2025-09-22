//////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, 2025 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider
//      local-stats
//////////////////////////////////////////////////////////////////////

const APP_UNIQUE_PREFIX = 'Interface_Arts_does-it-glider_duppy_v1.2025.09.21'
const SEED_HASHES_KEY = `${APP_UNIQUE_PREFIX}_unique_seed_hashes`
const MAX_GEN_COUNT_KEY = `${APP_UNIQUE_PREFIX}_max_gen_count`

export function hash_seed(seed_arr) {
    // Use joined string as the key
    return seed_arr.join('\n')
}

let cached_seed_hashes = null
let cached_seed_count = null
let cached_max_gen_count = null

export function get_seed_hashes() {
    if (cached_seed_hashes !== null) return cached_seed_hashes
    try { // because JSON.parse throws errors on invalid JSON instead of just returning null
        cached_seed_hashes = JSON.parse(localStorage.getItem(SEED_HASHES_KEY) || '{}')
    } catch {
        cached_seed_hashes = {}
    }
    return cached_seed_hashes
}

export function add_seed_hash(hash) {
    let hashes = get_seed_hashes();
    if (!hashes[hash]) {
        hashes[hash] = true;
        cached_seed_hashes = hashes
        cached_seed_count = Object.keys(hashes).length
        localStorage.setItem(SEED_HASHES_KEY, JSON.stringify(hashes))
    }
}

export function get_seed_count() {
    if (cached_seed_count === null) {
        cached_seed_count = Object.keys(get_seed_hashes()).length
    }
    return cached_seed_count
}

export function get_max_gen_count() {
    if (cached_max_gen_count !== null) return cached_max_gen_count
    cached_max_gen_count = Number(localStorage.getItem(MAX_GEN_COUNT_KEY) || '0')
    return cached_max_gen_count
}

export function set_max_gen_count(count) {
    cached_max_gen_count = count
    localStorage.setItem(MAX_GEN_COUNT_KEY, String(count))
}

export function reset_stats() {
    localStorage.removeItem(SEED_HASHES_KEY);
    localStorage.removeItem(MAX_GEN_COUNT_KEY);
    cached_seed_count = null;
    cached_seed_hashes = null;
    cached_max_gen_count = null;
}
