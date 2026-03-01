// Updated 2026-02-27T03:45:00Z - 在 DraggableDroppableBin 层面检测点击，绕过 DnD Kit 的 pointer capture/preventDefault 问题
"use client";

import { useState, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import { Bin } from "./Bin";
import { useWarehouseStore } from "@/store/warehouseStore";
import clsx from "clsx";
import { DndContext, type DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";

function DraggableDroppableBin({ binId, col, row, layer }: { binId: string, col: string, row: number, layer: number }) {
    const existingBin = useWarehouseStore(s => s.bins.find(b => b.id === binId));
    const selectBin = useWarehouseStore(s => s.selectBin);
    const toggleBinSelection = useWarehouseStore(s => s.toggleBinSelection);
    const selectedBinIds = useWarehouseStore(s => s.selectedBinIds);
    const isMultiSelecting = selectedBinIds.length > 1;

    const bin = existingBin || {
        id: binId,
        col,
        row,
        layer,
        sku: null,
        quantity: 0,
        items: [],
        inboundTime: null
    };

    const [showBinModal, setShowBinModal] = useState(false);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `drag-${binId}`,
        data: { sourceBin: bin }
    });

    const { isOver, setNodeRef: setDropRef } = useDroppable({
        id: `drop-${binId}`,
        data: { targetBin: bin }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : 1,
    } : undefined;

    // DnD Kit 的 preventDefault 会阻止 click 事件，所以通过 pointerdown/pointerup 手动检测点击
    const pointerStart = useRef<{ x: number; y: number; time: number } | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const longPressTriggered = useRef(false);

    const handleMergedPointerDown = (e: ReactPointerEvent) => {
        pointerStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };
        longPressTriggered.current = false;

        longPressTimer.current = setTimeout(() => {
            longPressTriggered.current = true;
            toggleBinSelection(binId);
            longPressTimer.current = null;
        }, 1000);

        // 调用 DnD Kit 的原始 onPointerDown
        const dndHandler = listeners?.onPointerDown;
        if (dndHandler && typeof dndHandler === "function") {
            (dndHandler as (e: ReactPointerEvent) => void)(e);
        }
    };

    const handlePointerUp = (e: ReactPointerEvent) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (longPressTriggered.current) {
            longPressTriggered.current = false;
            pointerStart.current = null;
            return;
        }

        if (pointerStart.current) {
            const dx = e.clientX - pointerStart.current.x;
            const dy = e.clientY - pointerStart.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 10) {
                if (isMultiSelecting) {
                    toggleBinSelection(binId);
                } else {
                    selectBin(binId);
                    setShowBinModal(true);
                }
            }
            pointerStart.current = null;
        }
    };

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
                onPointerDown={handleMergedPointerDown}
                onPointerUp={handlePointerUp}
                {...attributes}
                className={clsx("w-full h-full", isDragging && "opacity-80 scale-105 cursor-grabbing")}
            >
                <div style={isDragging ? { pointerEvents: "none" } : undefined} className="w-full h-full touch-none">
                    <Bin bin={bin} showModal={showBinModal} onCloseModal={() => setShowBinModal(false)} />
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
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 p-4">
            {/* Controls */}
            <div className="flex justify-between items-center glass p-3 rounded-xl">
                <h2 className="text-lg font-bold">Aisle {aisleId}</h2>
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
                <div className="relative w-full overflow-hidden min-h-[400px] flex items-center justify-center bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 [perspective:2000px]">

                    <motion.div
                        layout
                        animate={{
                            rotateX: is3D ? 50 : 0,
                            rotateZ: is3D ? -25 : 0,
                            scale: is3D ? 0.7 : 1,
                        }}
                        transition={{ duration: 0.8, type: "spring", bounce: 0.1 }}
                        className="flex flex-col gap-6 transform-gpu [transform-style:preserve-3d] w-full"
                    >
                        {/* Render layers side by side or stacked based on 3D */}
                        {Array.from({ length: maxLayer }).map((_, layerIdx) => {
                            const layer = layerIdx + 1;
                            return (
                                <motion.div
                                    layout
                                    key={layer}
                                    animate={{
                                        translateZ: is3D ? (layer - 1) * 50 : 0,
                                        y: is3D ? (layer - 1) * -12 : 0,
                                    }}
                                    className={clsx(
                                        "grid gap-1.5 border-2 border-slate-300 dark:border-slate-700 p-3 pt-5 rounded-xl shadow-lg bg-white/70 dark:bg-slate-800/80 backdrop-blur-md transition-all transform-gpu",
                                        is3D && "shadow-xl"
                                    )}
                                    style={{
                                        gridTemplateColumns: `repeat(${maxRow}, minmax(0, 1fr))`
                                    }}
                                >
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white px-2 py-0.5 rounded text-xs font-bold z-10">
                                        Layer {layer}
                                    </div>

                                    {Array.from({ length: maxRow }).map((_, rowIdx) => {
                                        const row = rowIdx + 1;
                                        const binId = `${aisleId}-L${layer}-R${row}`;
                                        return <DraggableDroppableBin key={binId} binId={binId} col={aisleId} row={row} layer={layer} />;
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
