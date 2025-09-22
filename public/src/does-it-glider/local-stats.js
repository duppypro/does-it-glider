//////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, 2025 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider
//      local-stats
////////////////////////////////////////////a//////////////////////////

const SEED_COUNT_KEY = 'dig_unique_seed_count_v1'
const SEED_HASHES_KEY = 'dig_unique_seed_hashes_v1'
const BROWSER_ID_KEY = 'dig_browser_id_v1'
const MAX_GEN_COUNT_KEY = 'dig_max_gen_count_v1'

/**
 * Retrieve a persistent browser ID from localStorage, creating and storing a new UUID if none exists.
 *
 * The ID is stored under the key defined by BROWSER_ID_KEY. If no ID is present, a new one is generated
 * via crypto.randomUUID() and saved to localStorage before being returned.
 *
 * @returns {string} The existing or newly created browser ID.
 */
export function getOrCreateBrowserId() {
    let id = localStorage.getItem(BROWSER_ID_KEY)
    if (!id) {
        id = crypto.randomUUID()
        console.log(`ID for local storage: ${id}`)
        localStorage.setItem(BROWSER_ID_KEY, id)
    }
    return id
}

/**
 * Create a UTF-8-safe compact representation of a seed array.
 *
 * Joins the array elements with newline characters, UTF-8 encodes the resulting string,
 * and returns the bytes encoded as a base64 string. If encoding fails (e.g., TextEncoder
 * or btoa is unavailable), returns the plain joined string as a fallback.
 *
 * @param {string[]} seedArr - Array of seed lines to encode.
 * @returns {string} Base64-encoded UTF-8 bytes of the joined seed string, or the plain joined string on failure.
 */
export function hashSeed(seedArr) {
    // Simple hash: join lines and get proper UTF-8
    try {
        const str = seedArr.join('\n')
        // Use TextEncoder for proper UTF-8 encoding
        const data = new TextEncoder().encode(str)
        return btoa(String.fromCharCode(...data))
    } catch {
        return seedArr.join('\n')
    }
}

/**
 * Retrieve the stored seed hashes from localStorage.
 *
 * Returns the parsed array saved under SEED_HASHES_KEY. If the item is missing
 * or JSON parsing fails, an empty array is returned.
 * @return {string[]} Array of seed hash strings.
 */
export function getSeedHashes() {
    try {
        return JSON.parse(localStorage.getItem(SEED_HASHES_KEY) || '[]')
    } catch {
        return []
    }
}

/**
 * Persist an array of seed hashes to localStorage.
 *
 * Overwrites any existing value stored under the SEED_HASHES_KEY by JSON-stringifying
 * the provided array and storing it.
 *
 * @param {string[]} hashes - Array of seed hash strings to store.
 */
export function setSeedHashes(hashes) {
    localStorage.setItem(SEED_HASHES_KEY, JSON.stringify(hashes))
}

/**
 * Read the stored unique seed count from localStorage.
 *
 * Returns the numeric value stored under SEED_COUNT_KEY or 0 if the key is missing or empty.
 * @return {number} The stored seed count (defaults to 0).
 */
export function getSeedCount() {
    return Number(localStorage.getItem(SEED_COUNT_KEY) || '0')
}

/**
 * Persist the total unique seed count to localStorage.
 * @param {number} count - New total of unique seeds; stored as a string under the SEED_COUNT_KEY.
 */
export function setSeedCount(count) {
    localStorage.setItem(SEED_COUNT_KEY, String(count))
}

/**
 * Retrieve the stored maximum generation count from localStorage.
 *
 * Reads the value at MAX_GEN_COUNT_KEY and converts it to a number.
 * If the key is absent or empty, this returns 0.
 * @returns {number} The maximum generation count, or 0 if not set.
 */
export function getMaxGenCount() {
    return Number(localStorage.getItem(MAX_GEN_COUNT_KEY) || '0')
}

/**
 * Persist the maximum generation count to localStorage.
 * @param {number} count - Maximum generation count to store (will be saved as a string).
 */
export function setMaxGenCount(count) {
    localStorage.setItem(MAX_GEN_COUNT_KEY, String(count))
}
