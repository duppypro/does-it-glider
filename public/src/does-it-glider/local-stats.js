//////////////////////////////////////////////////////////////////////
//  (c) 2023, 2024, 2025 David 'Duppy' Proctor, Interface Arts
//
//  does-it-glider
//      local-stats
////////////////////////////////////////////a//////////////////////////

export const SEED_COUNT_KEY = 'dig_unique_seed_count_v1'
export const SEED_HASHES_KEY = 'dig_unique_seed_hashes_v1'
export const BROWSER_ID_KEY = 'dig_browser_id_v1'

export function getOrCreateBrowserId() {
    let id = localStorage.getItem(BROWSER_ID_KEY)
    if (!id) {
        id = crypto.randomUUID()
        console.log(`ID for local storage: ${id}`)
        localStorage.setItem(BROWSER_ID_KEY, id)
    }
    return id
}

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

export function getSeedHashes() {
    try {
        return JSON.parse(localStorage.getItem(SEED_HASHES_KEY) || '[]')
    } catch {
        return []
    }
}

export function setSeedHashes(hashes) {
    localStorage.setItem(SEED_HASHES_KEY, JSON.stringify(hashes))
}

export function getSeedCount() {
    return Number(localStorage.getItem(SEED_COUNT_KEY) || '0')
}

export function setSeedCount(count) {
    localStorage.setItem(SEED_COUNT_KEY, String(count))
}
