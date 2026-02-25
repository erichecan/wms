import React, { useState } from 'react';
import { Package, MapPin } from 'lucide-react';

export default function GridMap({ grid, agentPos, orders, status, mode, updateCell, globalPath = [] }) {
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawMode, setDrawMode] = useState(null); // 'ADD' or 'REMOVE'

    const handleMouseDown = (e, x, y) => {
        if (mode !== 'EDIT') return;
        setIsDrawing(true);
        // Left click = ADD, Right click = REMOVE
        const isRemove = e.button === 2 || e.shiftKey;
        setDrawMode(isRemove ? 'REMOVE' : 'ADD');
        updateCell(x, y, !isRemove);
    };

    const handleMouseEnter = (x, y) => {
        if (mode !== 'EDIT' || !isDrawing) return;
        updateCell(x, y, drawMode === 'ADD');
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
        setDrawMode(null);
    };

    return (
        <div
            className={`grid-container ${mode === 'EDIT' ? 'edit-mode' : ''} `}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()}
        >
            {grid.map((row, y) => (
                <div key={`row-${y} `} className="grid-row">
                    {row.map((cell, x) => {
                        const isAgent = agentPos.x === x && agentPos.y === y && mode !== 'EDIT';
                        const isOrder = orders.some(o => o.x === x && o.y === y);
                        const isShelf = cell.isShelf;
                        const isStart = x === 0 && y === grid.length - 1;
                        const isInGlobalPath = globalPath.some(p => p.x === x && p.y === y);

                        let classes = ['grid-cell'];
                        if (isShelf) classes.push('shelf');
                        if (isOrder) classes.push('order');
                        if (isStart) classes.push('start-zone');
                        if (isInGlobalPath && !isShelf && mode !== 'EDIT' && status !== 'COMPLETED') classes.push('path-highlight');

                        return (
                            <div
                                key={`${x}-${y}`}
                                className={classes.join(' ')}
                                onMouseDown={(e) => handleMouseDown(e, x, y)}
                                onMouseEnter={() => handleMouseEnter(x, y)}
                            >
                                {isShelf && cell.aisleId && (
                                    <span style={{ fontSize: '0.45rem', opacity: 0.8, color: '#fff', userSelect: 'none' }}>
                                        {cell.aisleId}
                                    </span>
                                )}
                                {isAgent && (
                                    <div className={`agent ${status.toLowerCase()}`}>
                                        <div className="agent-dot" />
                                        {status === 'PICKING' && (
                                            <span className="picking-indicator">Picking...</span>
                                        )}
                                    </div>
                                )}
                                {isOrder && !isAgent && <Package className="icon-order" size={14} />}
                                {isStart && !isAgent && <MapPin className="icon-start" size={14} />}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
