import { useState, useEffect } from 'react';
import { generateGrid, START_POS, getRandomValidAisle } from './GridConfig';
import { aStar } from './AStar';
import { solveTSPWithAStar } from './TSP';

export const AGENT_SPEED_MS = 250;
export const PICK_DURATION_MS = 2000;

export function useWarehouseSimulation() {
    const [grid, setGrid] = useState(() => {
        const saved = localStorage.getItem('warehouse_grid');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return generateGrid();
            }
        }
        return generateGrid();
    });

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
        generateOrder, startSimulation
    };
}
