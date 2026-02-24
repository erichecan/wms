"use client";

import { useRef, useState } from "react";
import { useWarehouseStore } from "@/store/warehouseStore";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Save, MousePointerSquareDashed, PlusSquare } from "lucide-react";

export function LayoutBuilder() {
    const dimensions = useWarehouseStore(s => s.dimensions);
    const updateDimensions = useWarehouseStore(s => s.updateDimensions);
    const aisles = useWarehouseStore(s => s.aisles);
    const obstacles = useWarehouseStore(s => s.obstacles);
    const updateAislePosition = useWarehouseStore(s => s.updateAislePosition);
    const updateObstaclePosition = useWarehouseStore(s => s.updateObstaclePosition);

    const [cellSize] = useState(40);
    const containerRef = useRef<HTMLDivElement>(null);

    const [colsInput, setColsInput] = useState(dimensions.cols);
    const [rowsInput, setRowsInput] = useState(dimensions.rows);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveLayout = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Warehouse layout was updated. Dimensions: ${dimensions.cols}x${dimensions.rows}. Tools/Aisles moved.`,
                    aisles,
                    obstacles
                })
            });
            alert("Layout saved! Notification email sent.");
        } catch (err) {
            console.error(err);
            alert("Layout saved locally. (Mock Email API printed to console)");
        }
        setIsSaving(false);
    };

    const handleApplyDimensions = () => {
        updateDimensions(colsInput, rowsInput);
    };

    // Helper to snap pixel coordinates to grid
    const snapToGrid = (value: number) => Math.round(value / cellSize);

    return (
        <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner overflow-hidden">
            {/* Toolbar */}
            <div className="glass flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <label className="text-sm opacity-70 font-medium">Width (Cols):</label>
                        <input
                            type="number"
                            value={colsInput}
                            onChange={e => setColsInput(Number(e.target.value))}
                            className="w-16 px-2 py-1 rounded bg-white dark:bg-slate-800 border-none outline-none ring-1 ring-slate-300 dark:ring-slate-700 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm opacity-70 font-medium">Length (Rows):</label>
                        <input
                            type="number"
                            value={rowsInput}
                            onChange={e => setRowsInput(Number(e.target.value))}
                            className="w-16 px-2 py-1 rounded bg-white dark:bg-slate-800 border-none outline-none ring-1 ring-slate-300 dark:ring-slate-700 focus:ring-indigo-500"
                        />
                    </div>
                    <button
                        onClick={handleApplyDimensions}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-sm font-medium transition-colors"
                    >
                        Apply Size
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors text-sm font-medium">
                        <PlusSquare className="w-4 h-4" />
                        Add Obstacle
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-medium">
                        <MousePointerSquareDashed className="w-4 h-4" />
                        Box Select
                    </button>
                    <button
                        onClick={handleSaveLayout}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors text-sm font-bold shadow-md shadow-emerald-500/20"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Save Layout"}
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto p-8 relative" ref={containerRef}>
                <div
                    className="relative bg-white dark:bg-slate-800 shadow-xl border border-slate-300 dark:border-slate-700 mx-auto"
                    style={{
                        width: dimensions.cols * cellSize,
                        height: dimensions.rows * cellSize,
                        backgroundImage: `linear-gradient(to right, rgba(128,128,128,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.1) 1px, transparent 1px)`,
                        backgroundSize: `${cellSize}px ${cellSize}px`,
                    }}
                >
                    {/* Render Aisles */}
                    {aisles.map(aisle => (
                        <motion.div
                            key={aisle.id}
                            drag
                            dragMomentum={false}
                            dragConstraints={containerRef}
                            onDragEnd={(e, info) => {
                                // Determine new grid cell
                                const deltaXGrid = snapToGrid(info.offset.x);
                                const deltaYGrid = snapToGrid(info.offset.y);
                                const newX = Math.max(0, Math.min(aisle.x + deltaXGrid, dimensions.cols - aisle.width));
                                const newY = Math.max(0, Math.min(aisle.y + deltaYGrid, dimensions.rows - aisle.height));
                                updateAislePosition(aisle.id, newX, newY);
                            }}
                            className="absolute bg-indigo-500/30 border-2 border-indigo-500 rounded cursor-grab active:cursor-grabbing flex items-center justify-center backdrop-blur-sm"
                            style={{
                                width: aisle.width * cellSize,
                                height: aisle.height * cellSize,
                                x: aisle.x * cellSize,
                                y: aisle.y * cellSize,
                            }}
                            // Need to animate explicitly to snap values perfectly
                            animate={{ x: aisle.x * cellSize, y: aisle.y * cellSize }}
                        >
                            <span className="font-bold text-indigo-700 dark:text-indigo-300 transform -rotate-90 origin-center whitespace-nowrap">
                                Aisle {aisle.id}
                            </span>
                        </motion.div>
                    ))}

                    {/* Render Obstacles */}
                    {obstacles.map(obs => (
                        <motion.div
                            key={obs.id}
                            drag
                            dragMomentum={false}
                            dragConstraints={containerRef}
                            onDragEnd={(e, info) => {
                                const deltaXGrid = snapToGrid(info.offset.x);
                                const deltaYGrid = snapToGrid(info.offset.y);
                                const newX = Math.max(0, Math.min(obs.x + deltaXGrid, dimensions.cols - obs.width));
                                const newY = Math.max(0, Math.min(obs.y + deltaYGrid, dimensions.rows - obs.height));
                                updateObstaclePosition(obs.id, newX, newY);
                            }}
                            className="absolute bg-amber-500/40 border-2 border-dashed border-amber-600 rounded cursor-grab active:cursor-grabbing flex items-center justify-center backdrop-blur-[2px]"
                            style={{
                                width: obs.width * cellSize,
                                height: obs.height * cellSize,
                                x: obs.x * cellSize,
                                y: obs.y * cellSize,
                            }}
                            animate={{ x: obs.x * cellSize, y: obs.y * cellSize }}
                        >
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-200">
                                Pillar
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
