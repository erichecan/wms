"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Bin } from "./Bin";
import { useWarehouseStore } from "@/store/warehouseStore";
import clsx from "clsx";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";

// We wrap the bin to make it draggable/droppable
function DraggableDroppableBin({ binId }: { binId: string }) {
    const bin = useWarehouseStore(s => s.bins.find(b => b.id === binId));
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `drag-${binId}`,
        data: { sourceBin: bin }
    });

    const { isOver, setNodeRef: setDropRef } = useDroppable({
        id: `drop-${binId}`,
        data: { targetBin: bin }
    });

    if (!bin) return null;

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : 1,
    } : undefined;

    return (
        <div
            ref={setDropRef}
            className={clsx(
                "relative rounded-lg transition-colors",
                isOver && "ring-2 ring-emerald-500 bg-emerald-500/20"
            )}
        >
            <div
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                className={clsx("w-full h-full", isDragging && "opacity-80 scale-105 cursor-grabbing")}
            >
                {/* Pass pointer events through to allow Bin's own click handlers if not dragging */}
                <div style={isDragging ? { pointerEvents: "none" } : undefined} className="w-full h-full touch-none">
                    <Bin bin={bin} />
                </div>
            </div>
        </div>
    );
}

export function AisleGrid({ aisleId }: { aisleId: string }) {
    const bins = useWarehouseStore(state => state.bins);
    const moveBinContents = useWarehouseStore(state => state.moveBinContents);
    const selectedBinIds = useWarehouseStore(state => state.selectedBinIds);
    const [is3D, setIs3D] = useState(false);

    // Filter bins for this particular aisle (column)
    // For simplicity, let's say an aisle maps exactly to a col string like "K1"
    const aisleBins = useMemo(() => bins.filter(b => b.col === aisleId), [bins, aisleId]);

    // Max rows and layers to generate the grid
    const maxRow = Math.max(...aisleBins.map(b => b.row), 1);
    const maxLayer = Math.max(...aisleBins.map(b => b.layer), 1);

    // DnD Sensors (distinguish between click and drag)
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10, // Drag requires 10px moving to start, allowing clicks to pass through
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const sourceBin = active.data.current?.sourceBin;
        const targetBin = over.data.current?.targetBin;

        if (sourceBin && targetBin && sourceBin.id !== targetBin.id) {
            // Determine what to move. If source is in selection, move all selection. Else move just source.
            const idsToMove = selectedBinIds.includes(sourceBin.id) ? selectedBinIds : [sourceBin.id];
            moveBinContents(idsToMove, targetBin.col, targetBin.row, targetBin.layer);

            // Trigger Email API
            try {
                await fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `Items moved from ${sourceBin.id} to ${targetBin.id}`,
                        sourceIds: idsToMove,
                        targetCol: targetBin.col,
                        targetRow: targetBin.row,
                        targetLayer: targetBin.layer
                    })
                });
            } catch (err) {
                console.warn("Failed to send notification via API", err);
            }
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 p-4">
            {/* Controls */}
            <div className="flex justify-between items-center glass p-4 rounded-xl">
                <h2 className="text-xl font-bold">Aisle {aisleId}</h2>
                <button
                    onClick={() => setIs3D(!is3D)}
                    className={clsx(
                        "px-4 py-2 rounded-lg font-medium transition-all",
                        is3D ? "bg-indigo-500 text-white shadow-md" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
                    )}
                >
                    {is3D ? "2D Plan View" : "3D Perspective (斜视图)"}
                </button>
            </div>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                {/* Main visually transformable container */}
                <div className="relative w-full overflow-hidden min-h-[600px] flex items-center justify-center bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 perspective-1000">

                    <motion.div
                        layout
                        animate={{
                            rotateX: is3D ? 60 : 0,
                            rotateZ: is3D ? -30 : 0,
                            scale: is3D ? 0.8 : 1
                        }}
                        transition={{ duration: 0.8, type: "spring", bounce: 0.1 }}
                        className="flex flex-col gap-8 transform-gpu transform-style-3d"
                    >
                        {/* Render layers side by side or stacked based on 3D */}
                        {Array.from({ length: maxLayer }).map((_, layerIdx) => {
                            const layer = layerIdx + 1;
                            return (
                                <motion.div
                                    layout
                                    key={layer}
                                    style={is3D ? { translateZ: `${layer * 100}px` } : {}}
                                    className={clsx(
                                        "grid gap-2 border-2 border-slate-300 dark:border-slate-700 p-4 rounded-xl shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm",
                                        is3D && "absolute top-0 left-0 w-full"
                                    )}
                                    style={{
                                        gridTemplateColumns: `repeat(${maxRow}, minmax(60px, 1fr))`
                                    }}
                                >
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white px-2 py-0.5 rounded text-xs font-bold">
                                        Layer {layer}
                                    </div>

                                    {Array.from({ length: maxRow }).map((_, rowIdx) => {
                                        const row = rowIdx + 1;
                                        const binId = `${aisleId}-L${layer}-R${row}`;
                                        // If bin doesn't exist, we could render empty placeholders, but let's assume dense grid
                                        return <DraggableDroppableBin key={binId} binId={binId} />;
                                    })}
                                </motion.div>
                            );
                        })}
                    </motion.div>

                </div>
            </DndContext>
        </div>
    );
}
