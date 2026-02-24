class Node {
    constructor(x, y, isObstacle = false) {
        this.x = x;
        this.y = y;
        this.isObstacle = isObstacle;
        this.g = 0;
        this.h = 0;
        this.f = 0;
        this.parent = null;
    }
}

export function aStar(gridDef, startPos, endPos) {
    // Deep copy nodes from grid structure
    const nodes = gridDef.map(row =>
        row.map(cell => new Node(cell.x, cell.y, cell.isShelf))
    );

    const startNode = nodes[startPos.y][startPos.x];
    const endNode = nodes[endPos.y][endPos.x];

    // If end is an obstacle (should not happen if we pick valid aisles), we can't walk there
    if (endNode.isObstacle) return [];

    let openSet = [startNode];
    let closedSet = new Set();

    while (openSet.length > 0) {
        let lowestIndex = 0;
        for (let i = 0; i < openSet.length; i++) {
            if (openSet[i].f < openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }

        let current = openSet[lowestIndex];

        if (current.x === endNode.x && current.y === endNode.y) {
            const path = [];
            let temp = current;
            while (temp.parent) {
                path.push({ x: temp.x, y: temp.y });
                temp = temp.parent;
            }
            path.push({ x: startNode.x, y: startNode.y });
            return path.reverse();
        }

        openSet.splice(lowestIndex, 1);
        closedSet.add(`${current.x},${current.y}`);

        const neighbors = [];
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // Up, Right, Down, Left

        for (const [dx, dy] of dirs) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            if (ny >= 0 && ny < nodes.length && nx >= 0 && nx < nodes[0].length) {
                neighbors.push(nodes[ny][nx]);
            }
        }

        for (const neighbor of neighbors) {
            if (closedSet.has(`${neighbor.x},${neighbor.y}`) || neighbor.isObstacle) {
                continue;
            }

            let tempG = current.g + 1;
            let newPath = false;

            if (openSet.includes(neighbor)) {
                if (tempG < neighbor.g) {
                    neighbor.g = tempG;
                    newPath = true;
                }
            } else {
                neighbor.g = tempG;
                newPath = true;
                openSet.push(neighbor);
            }

            if (newPath) {
                neighbor.h = Math.abs(neighbor.x - endNode.x) + Math.abs(neighbor.y - endNode.y); // Manhattan
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = current;
            }
        }
    }

    return [];
}
