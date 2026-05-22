const fs = require('fs');

const phases = [
    [[2,1], [3,2], [1,3], [2,3], [3,3]], // Phase 0
    [[1,1], [3,1], [2,2], [3,2], [2,3]], // Phase 1
    [[3,1], [1,2], [3,2], [2,3], [3,3]], // Phase 2
    [[1,1], [2,2], [3,2], [1,3], [2,3]]  // Phase 3
];

function step(liveCells) {
    const counts = new Map();
    for (const [x, y] of liveCells) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const key = `${x + dx},${y + dy}`;
                counts.set(key, (counts.get(key) || 0) + 1);
            }
        }
    }
    const nextLive = [];
    const liveSet = new Set(liveCells.map(([x,y]) => `${x},${y}`));
    for (const [key, count] of counts.entries()) {
        if (count === 3 || (count === 2 && liveSet.has(key))) {
            const [x, y] = key.split(',').map(Number);
            nextLive.push([x, y]);
        }
    }
    return nextLive;
}

const expected = phases.map(p => {
    const s = step(p);
    s.sort((a,b) => a[0]-b[0] || a[1]-b[1]);
    return s;
});

function runTest() {
    const results = [];
    for (let p = 0; p < 4; p++) {
        const currentPhase = phases[p];
        const nextPhase = expected[p];
        
        const moat = [];
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                if (!currentPhase.some(([cx, cy]) => cx === x && cy === y)) {
                    moat.push([x, y]);
                }
            }
        }
        
        let perfectCount = 0;
        let intactCount = 0;
        let safeConfigs = [];
        
        const total = 1 << 20;
        for (let mask = 0; mask < total; mask++) {
            const live = [...currentPhase];
            for (let i = 0; i < 20; i++) {
                if ((mask & (1 << i))) {
                    live.push(moat[i]);
                }
            }
            
            const nextLive = step(live);
            
            const nextSet = new Set(nextLive.map(([x,y]) => `${x},${y}`));
            let intact = true;
            for (const cell of nextPhase) {
                if (!nextSet.has(`${cell[0]},${cell[1]}`)) {
                    intact = false;
                    break;
                }
            }
            
            if (intact) {
                intactCount++;
                if (nextLive.length === 5) {
                    perfectCount++;
                    if (mask > 0) { // If it's not the empty moat
                        const added = [];
                        for (let i = 0; i < 20; i++) {
                            if ((mask & (1 << i))) added.push(moat[i]);
                        }
                        safeConfigs.push(added);
                    }
                }
            }
        }
        results.push({ phase: p, total, perfectCount, intactCount, safeConfigs });
    }
    console.log(JSON.stringify(results, null, 2));
}
runTest();