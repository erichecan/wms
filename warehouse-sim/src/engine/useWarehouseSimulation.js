import { useState, useEffect } from 'react';
import { generateGrid, START_POS, getRandomValidAisle } from './GridConfig';
import { aStar } from './AStar';
import { solveTSPWithAStar } from './TSP';

export const AGENT_SPEED_MS = 250;
export const PICK_DURATION_MS = 2000;

export function useWarehouseSimulation() {
    const [grid, setGrid] = useState([]);
    const [loadingLayout, setLoadingLayout] = useState(true);

    useEffect(() => {
        // Fetch real layout from wms-clean backend
        fetch('http://localhost:3000/api/layout')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.layout && data.layout.length > 0) {
                    // Reconstruct grid based on layout data
                    // We'll calculate max X and max Y from the layout to determine GRID_SIZE
                    // For now, let's just override the shelves based on the aisle IDs
                    // A simple approximation for 2D map:
                    // Place real aisles onto the grid dynamically
                    // We'll create a 20x20 grid (or rely on layout max dimensions)
                    const newGrid = generateGrid();

                    // Clear default shelves since we have actual layout
                    for (let y = 0; y < 20; y++) {
                        for (let x = 0; x < 20; x++) {
                            newGrid[y][x].isShelf = false;
                            newGrid[y][x].aisleId = null;
                        }
                    }

                    // A basic packing logic: Place real aisles in rows
                    let currX = 2;
                    let currY = 2;
                    data.layout.forEach((aisle) => {
                        // Mark this segment as a shelf corresponding to an Aisle code
                        if (currX < 18 && currY < 18) {
                            newGrid[currY][currX].isShelf = true;
                            newGrid[currY][currX].aisleId = aisle.id;

                            newGrid[currY + 1][currX].isShelf = true; // Make shelf 2 dots long 
                            newGrid[currY + 1][currX].aisleId = aisle.id;

                            currX += 3; // Shift right
                            if (currX > 16) {
                                currX = 2;
                                currY += 4; // Shift down to next row
                            }
                        }
                    });

                    setGrid(newGrid);
                } else {
                    setGrid(generateGrid());
                }
            })
            .catch(err => {
                console.error("Failed to load layout:", err);
                const saved = localStorage.getItem('warehouse_grid');
                if (saved) {
                    try {
                        setGrid(JSON.parse(saved));
                    } catch (e) {
                        setGrid(generateGrid());
                    }
                } else {
                    setGrid(generateGrid());
                }
            })
            .finally(() => setLoadingLayout(false));
    }, []);

    const [mode, setMode] = useState('SIMULATE'); // 'SIMULATE' | 'EDIT'
    const [agentPos, setAgentPos] = useState(START_POS);
    const [orders, setOrders] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [globalPath, setGlobalPath] = useState([]); // TSP Route
    const [status, setStatus] = useState('IDLE');

    const [metrics, setMetrics] = useState({
        distanceWalked: 0,
        timeElapsed: 0,
        itemsPicked: 0,
        totalItems: 0,
    });

    const generateOrder = (itemCount = 5) => {
        if (mode === 'EDIT') return;
        const newItems = [];
        for (let i = 0; i < itemCount; i++) {
            newItems.push(getRandomValidAisle(grid));
        }

        const { orderedTargets, fullPath } = solveTSPWithAStar(grid, START_POS, newItems, START_POS);

        setOrders(orderedTargets);
        setGlobalPath(fullPath);
        setMetrics({ distanceWalked: 0, timeElapsed: 0, itemsPicked: 0, totalItems: itemCount });
        setAgentPos(START_POS);
        setStatus('IDLE');
        setCurrentPath([]);
    };

    const startSimulation = () => {
        if (mode === 'EDIT' || orders.length === 0 || status !== 'IDLE') return;
        setStatus('MOVING');
        processNextTarget(START_POS, [...orders], 0);
    };

    const processNextTarget = (currentPos, remainingOrders, pickedCount) => {
        if (remainingOrders.length === 0) {
            const returnPath = aStar(grid, currentPos, START_POS);
            setStatus('RETURNING');
            walkPath(returnPath, () => {
                setStatus('COMPLETED');
                setGlobalPath([]); // Clear the visual glowing lines when done
            });
            return;
        }

        // We already ordered the targets using TSP during generation.
        // We just take the first one off the list.
        const nextTarget = remainingOrders[0];
        const rest = remainingOrders.slice(1);

        const path = aStar(grid, currentPos, nextTarget);
        if (!path || path.length === 0) {
            // Unreachable? skip
            processNextTarget(currentPos, rest, pickedCount);
            return;
        }

        setStatus('MOVING');
        walkPath(path, (finalPos) => {
            setStatus('PICKING');
            setTimeout(() => {
                setMetrics(m => ({ ...m, itemsPicked: pickedCount + 1 }));
                processNextTarget(finalPos, rest, pickedCount + 1);
            }, PICK_DURATION_MS);
        });
    };

    const walkPath = (path, onComplete) => {
        if (path.length <= 1) {
            onComplete(path[0] || agentPos);
            return;
        }

        let stepIndex = 0;
        setCurrentPath(path);

        const timer = setInterval(() => {
            // If user switched to EDIT mode while agent was walking, abort.
            if (window.__forceStopSimulation) {
                clearInterval(timer);
                return;
            }
            stepIndex++;
            if (stepIndex >= path.length) {
                clearInterval(timer);
                setCurrentPath([]);
                onComplete(path[path.length - 1]);
            } else {
                const nextPos = path[stepIndex];
                setAgentPos(nextPos);
                setMetrics(m => ({ ...m, distanceWalked: m.distanceWalked + 1 }));
            }
        }, AGENT_SPEED_MS);
    };

    useEffect(() => {
        let t;
        if (status !== 'IDLE' && status !== 'COMPLETED' && mode === 'SIMULATE') {
            t = setInterval(() => {
                setMetrics(m => ({ ...m, timeElapsed: m.timeElapsed + 1 }));
            }, 1000);
        }
        return () => clearInterval(t);
    }, [status, mode]);

    // Mode switching logic
    const toggleMode = () => {
        if (mode === 'SIMULATE') {
            setMode('EDIT');
            window.__forceStopSimulation = true; // hack to break walkPath interval
            setStatus('IDLE');
            setOrders([]);
            setCurrentPath([]);
            setGlobalPath([]);
            setAgentPos(START_POS);
        } else {
            setMode('SIMULATE');
            window.__forceStopSimulation = false;
            localStorage.setItem('warehouse_grid', JSON.stringify(grid));
        }
    };

    const updateCell = (x, y, isShelf) => {
        if (mode !== 'EDIT') return;
        // Don't draw over start position
        if (x === START_POS.x && y === START_POS.y) return;

        setGrid(prev => {
            const newGrid = prev.map(row => [...row]);
            newGrid[y][x] = { ...newGrid[y][x], isShelf };
            return newGrid;
        });
    };

    const clearGrid = () => {
        if (mode !== 'EDIT') return;
        if (window.confirm('Wipe out all shelves and reset to empty?')) {
            const empty = generateGrid().map(r => r.map(c => ({ ...c, isShelf: false })));
            setGrid(empty);
        }
    };

    const resetToDefault = () => {
        if (mode !== 'EDIT') return;
        setGrid(generateGrid());
        localStorage.removeItem('warehouse_grid');
    };

    return {
        grid, agentPos, currentPath, globalPath, status, metrics, orders,
        mode, toggleMode, updateCell, clearGrid, resetToDefault,
        generateOrder, startSimulation, loadingLayout
    };
}
