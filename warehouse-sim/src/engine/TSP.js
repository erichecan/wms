import { aStar } from './AStar';

// Helper to calculate total distance of a specific ordered array of nodes
function calculatePathDistance(pathArray) {
    let dist = 0;
    for (let p of pathArray) {
        dist += p.length;
    }
    return dist;
}

// Generate all permutations of an array 
// (Caution: Only safe for small arrays N <= 8, our orders are usually ~5 items)
function permute(permutation) {
    var length = permutation.length,
        result = [permutation.slice()],
        c = new Array(length).fill(0),
        i = 1, k, p;

    while (i < length) {
        if (c[i] < i) {
            k = i % 2 && c[i];
            p = permutation[i];
            permutation[i] = permutation[k];
            permutation[k] = p;
            ++c[i];
            i = 1;
            result.push(permutation.slice());
        } else {
            c[i] = 0;
            ++i;
        }
    }
    return result;
}

/**
 * Calculates the absolute optimal multi-stop path (TSP) through a grid.
 * 
 * @param {Array} grid - The 2D grid definition 
 * @param {Object} start - Starting coordinate {x, y}
 * @param {Array} targets - Array of target coordinates [{x,y}, {x,y}...]
 * @param {Object} end - Final return coordinate (usually same as start)
 * @returns {Array} An array containing the ordered target sequence and full contiguous path points.
 */
export function solveTSPWithAStar(grid, start, targets, end) {
    if (!targets || targets.length === 0) return { orderedTargets: [], fullPath: [] };

    // 1. Precalculate A* distances between all key nodes (start, end, and all targets)
    // This builds a distance matrix graph so we don't run A* thousands of times in the permutation loop
    const nodes = [start, ...targets, end];
    const nodeIds = nodes.map(n => `${n.x},${n.y}`);

    const distanceCache = {}; // "nodeA->nodeB" = pathArray

    for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const key = `${nodeIds[i]}->${nodeIds[j]}`;
            // In grid worlds with no one-way streets, A->B is same length as B->A, 
            // but let's just calculate it for simplicity of assembling the final path sequence
            const path = aStar(grid, nodes[i], nodes[j]);
            distanceCache[key] = path;
        }
    }

    // 2. Generate all possible orderings of the TARGET indices (1 to targets.length)
    const targetIndices = targets.map((_, idx) => idx + 1); // e.g [1, 2, 3, 4, 5]
    const allRoutes = permute(targetIndices);

    let bestRouteSequence = null;
    let minDistance = Infinity;
    let bestFullPath = [];

    // 3. Evaluate each route sequence 
    for (const route of allRoutes) {
        // Route always looks like: 0 (Start) -> sequence... -> N (End)
        const fullSequence = [0, ...route, nodes.length - 1];

        let routeDist = 0;
        let validRoute = true;
        let tempFullPath = [];

        for (let i = 0; i < fullSequence.length - 1; i++) {
            const fromNodeId = nodeIds[fullSequence[i]];
            const toNodeId = nodeIds[fullSequence[i + 1]];
            const legPath = distanceCache[`${fromNodeId}->${toNodeId}`];

            if (!legPath || legPath.length === 0) {
                // Path is blocked/impossible, this sequence fails
                validRoute = false;
                break;
            }

            routeDist += legPath.length;

            // Stitchpaths together: remove the first node of each leg so we don't have overlapping points
            // except for the very first leg where we want the origin.
            if (i === 0) {
                tempFullPath.push(...legPath);
            } else {
                tempFullPath.push(...legPath.slice(1));
            }
        }

        if (validRoute && routeDist < minDistance) {
            minDistance = routeDist;
            bestRouteSequence = route; // only the middle targets
            bestFullPath = tempFullPath;
        }
    }

    // 4. Return the optimally ordered targets and the full continuous path coordinates
    const orderedTargets = bestRouteSequence.map(idx => targets[idx - 1]);

    return {
        orderedTargets,
        fullPath: bestFullPath
    };
}
