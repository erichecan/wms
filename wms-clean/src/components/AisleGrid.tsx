// Updated 2026-02-27T08:30:00Z - 修复点击/触屏：降低 click 阈值，优化 TouchSensor，增强 3D 立方体效果
"use client";

import { useState, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import { Bin } from "./Bin";
import { useWarehouseStore } from "@/store/warehouseStore";
import clsx from "clsx";
import { DndContext, type DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";

// 2026-02-27 选择目标模式：点击 bin 时若 pendingSkuMove 存在则执行 moveSkuToBin
function DraggableDroppableBin({ binId, col, row, rack }: { binId: string, col: string, row: number, rack: number }) {
    const existingBin = useWarehouseStore(s => s.bins.find(b => b.id === binId));
    const selectBin = useWarehouseStore(s => s.selectBin);
    const toggleBinSelection = useWarehouseStore(s => s.toggleBinSelection);
    const selectedBinIds = useWarehouseStore(s => s.selectedBinIds);
    const pendingSkuMove = useWarehouseStore(s => s.pendingSkuMove);
    const moveSkuToBin = useWarehouseStore(s => s.moveSkuToBin);
    const setPendingSkuMove = useWarehouseStore(s => s.setPendingSkuMove);
    const isMultiSelecting = selectedBinIds.length > 1;
    const isSelectTargetMode = !!pendingSkuMove;

    const bin = existingBin || {
        id: binId,
        col,
        row,
        rack,
        sku: null,
        quantity: 0,
        items: [],
        inboundTime: null
    };

    const [showBinModal, setShowBinModal] = useState(false);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `drag-${binId}`,
        data: { sourceBin: bin },
        disabled: isSelectTargetMode
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
        const x = e.clientX;
        const y = e.clientY;
        pointerStart.current = { x, y, time: Date.now() };
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
            if (distance < 12) {
                if (isSelectTargetMode) {
                    if (binId === pendingSkuMove!.sourceBinId) return;
                    moveSkuToBin(pendingSkuMove!.sourceBinId, pendingSkuMove!.sku, pendingSkuMove!.quantity, binId);
                    setPendingSkuMove(null);
                } else if (isMultiSelecting) {
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
                isOver && "ring-2 ring-[#D94828] bg-[#D94828]/20",
                isSelectTargetMode && binId !== pendingSkuMove?.sourceBinId && "ring-2 ring-[#D94828]/60 bg-[#D94828]/10"
            )}
        >
            <div
                ref={setNodeRef}
                style={style}
                onPointerDown={handleMergedPointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => { pointerStart.current = null; if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
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
    const pendingSkuMove = useWarehouseStore(state => state.pendingSkuMove);
    const setPendingSkuMove = useWarehouseStore(state => state.setPendingSkuMove);
    const [is3D, setIs3D] = useState(false);

    // Filter bins for this particular aisle (column)
    // For simplicity, let's say an aisle maps exactly to a col string like "K1"
    const aisleBins = useMemo(() => bins.filter(b => b.col === aisleId), [bins, aisleId]);

    // Max rows and racks to generate the grid
    const maxRow = Math.max(...aisleBins.map(b => b.row), 1);
    const maxRack = Math.max(...aisleBins.map(b => b.rack), 1);

    // 2026-02-27T09:35:00Z - 触屏 1100ms 长按先触发多选，再移动才拖拽
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 1100, tolerance: 8 } })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const sourceBin = active.data.current?.sourceBin;
        const targetBin = over.data.current?.targetBin;

        if (sourceBin && targetBin && sourceBin.id !== targetBin.id) {
            // Determine what to move. If source is in selection, move all selection. Else move just source.
            const idsToMove = selectedBinIds.includes(sourceBin.id) ? selectedBinIds : [sourceBin.id];
            moveBinContents(idsToMove, targetBin.col, targetBin.row, targetBin.rack);

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
                        targetRack: targetBin.rack
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
                        is3D ? "bg-[#D94828] text-white shadow-md" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                    )}
                >
                    {is3D ? "2D Plan View" : "3D Perspective (斜视图)"}
                </button>
            </div>

            {pendingSkuMove && (
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[#D94828]/10 border border-[#D94828]/30 text-zinc-800 dark:text-zinc-200">
                    <span className="font-medium">
                        选择目标库位：将 SKU <code className="font-mono font-bold px-1 rounded bg-[#D94828]/20">{pendingSkuMove.sku}</code> × {pendingSkuMove.quantity} 移动到其他托盘
                    </span>
                    <button
                        onClick={() => setPendingSkuMove(null)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-500/30 hover:bg-zinc-500/50 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                    >
                        取消
                    </button>
                </div>
            )}

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                {/* Main visually transformable container */}
                <div className="relative w-full overflow-hidden min-h-[400px] flex items-center justify-center bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 [perspective:1200px]">

                    <motion.div
                        layout
                        animate={{
                            rotateX: is3D ? 55 : 0,
                            rotateZ: is3D ? -28 : 0,
                            scale: is3D ? 0.85 : 1,
                        }}
                        transition={{ duration: 0.8, type: "spring", bounce: 0.1 }}
                        className="flex flex-col gap-4 transform-gpu [transform-style:preserve-3d] w-full"
                    >
                        {/* 3D 立方体效果：每层有明显 Z 间隔、阴影与边框 */}
                        {Array.from({ length: maxRack }).map((_, rackIdx) => {
                            const rackNum = rackIdx + 1;
                            const zDepth = is3D ? (rackNum - 1) * 80 : 0;
                            const yOffset = is3D ? (rackNum - 1) * -20 : 0;
                            return (
                                <motion.div
                                    layout
                                    key={rackNum}
                                    animate={{
                                        translateZ: zDepth,
                                        y: yOffset,
                                    }}
                                    className={clsx(
                                        "grid gap-1.5 border-2 p-3 pt-5 rounded-xl transition-all transform-gpu [transform-style:preserve-3d]",
                                        is3D
                                            ? "border-[#D94828]/60 bg-gradient-to-b from-[#D94828]/20 to-zinc-800/90 shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                                            : "border-zinc-300 dark:border-zinc-700 shadow-lg bg-white/70 dark:bg-zinc-800/80 backdrop-blur-md"
                                    )}
                                    style={{
                                        gridTemplateColumns: `repeat(${maxRow}, minmax(0, 1fr))`,
                                        ...(is3D && { boxShadow: `0 ${10 + rackNum * 6}px ${20 + rackNum * 8}px rgba(0,0,0,0.35)` }),
                                    }}
                                >
                                    <div className="absolute -top-3 left-4 bg-zinc-800 text-white px-2 py-0.5 rounded text-xs font-bold z-10">
                                        Rack {rackNum}
                                    </div>

                                    {Array.from({ length: maxRow }).map((_, rowIdx) => {
                                        const row = rowIdx + 1;
                                        const binId = `${aisleId}-L${rackNum}-R${row}`;
                                        return <DraggableDroppableBin key={binId} binId={binId} col={aisleId} row={row} rack={rackNum} />;
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
