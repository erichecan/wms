// Updated 2026-02-27T04:00:00Z - 添加拖拽通道功能
"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, X, Layers, GripVertical, Edit2, Check, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWarehouseStore, type Bin, type BinItem } from "@/store/warehouseStore";
import clsx from "clsx";

interface BinStack {
    col: string;
    row: number;
    bins: Bin[];
    hasItems: boolean;
}

// Updated 2026-02-27T04:35:00Z - 弹窗表格组件：展示 SKU/数量/入库时间，可编辑
interface EditRow {
    binId: string;
    layer: number;
    itemIdx: number;
    sku: string;
    quantity: number;
}

function StackDetailModal({ stack, onClose }: { stack: BinStack; onClose: () => void }) {
    const updateBin = useWarehouseStore(s => s.updateBin);
    const [isEditing, setIsEditing] = useState(false);
    const [editRows, setEditRows] = useState<EditRow[]>([]);

    const allRows = [...stack.bins].reverse().flatMap(bin => {
        const layerLetter = String.fromCharCode(64 + bin.layer);
        const items: BinItem[] = Array.isArray(bin.items) && bin.items.length > 0
            ? bin.items
            : bin.sku ? [{ sku: bin.sku, quantity: bin.quantity }] : [];

        if (items.length === 0) {
            return [{
                binId: bin.id,
                layer: bin.layer,
                layerLetter,
                displayId: `${bin.col}-${bin.row}-${layerLetter}`,
                sku: "",
                quantity: 0,
                inboundTime: bin.inboundTime,
                itemIdx: 0,
                isEmpty: true,
            }];
        }

        return items.map((item, idx) => ({
            binId: bin.id,
            layer: bin.layer,
            layerLetter,
            displayId: `${bin.col}-${bin.row}-${layerLetter}`,
            sku: item.sku,
            quantity: item.quantity,
            inboundTime: bin.inboundTime,
            itemIdx: idx,
            isEmpty: false,
        }));
    });

    const startEditing = () => {
        setEditRows(allRows.map(r => ({
            binId: r.binId,
            layer: r.layer,
            itemIdx: r.itemIdx,
            sku: r.sku,
            quantity: r.quantity,
        })));
        setIsEditing(true);
    };

    const handleSave = async () => {
        const binUpdates = new Map<string, { bin: Bin; items: BinItem[] }>();

        for (const bin of stack.bins) {
            binUpdates.set(bin.id, { bin, items: [] });
        }

        for (const row of editRows) {
            if (row.sku.trim()) {
                const entry = binUpdates.get(row.binId);
                if (entry) {
                    entry.items.push({ sku: row.sku.trim(), quantity: row.quantity });
                }
            }
        }

        for (const [binId, { items }] of binUpdates) {
            const totalQty = items.reduce((s, i) => s + i.quantity, 0);
            await updateBin(binId, {
                items,
                sku: items[0]?.sku || null,
                quantity: totalQty,
            });
        }

        setIsEditing(false);
    };

    const handleCancel = () => setIsEditing(false);

    const updateEditRow = (idx: number, field: "sku" | "quantity", value: string | number) => {
        setEditRows(prev => prev.map((r, i) =>
            i === idx
                ? { ...r, [field]: field === "quantity" ? Number(value) : value }
                : r
        ));
    };

    const addEditRow = (binId: string, layer: number) => {
        setEditRows(prev => [...prev, { binId, layer, itemIdx: prev.length, sku: "", quantity: 0 }]);
    };

    const removeEditRow = (idx: number) => {
        setEditRows(prev => prev.filter((_, i) => i !== idx));
    };

    const formatTime = (t: string | null) => {
        if (!t) return "-";
        try { return new Date(t).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
        catch { return "-"; }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-400" />
                        {stack.col} - Row {stack.row}
                    </h3>
                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <button
                                onClick={startEditing}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                title="编辑"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <>
                                <button onClick={handleSave} className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors" title="保存">
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={handleCancel} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors" title="取消">
                                    <X className="w-4 h-4" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="max-h-[65vh] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-800 text-slate-400 uppercase text-xs">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold w-14">层</th>
                                <th className="text-left py-3 px-4 font-semibold">SKU</th>
                                <th className="text-right py-3 px-4 font-semibold w-20">数量</th>
                                <th className="text-right py-3 px-4 font-semibold w-32">入库时间</th>
                                {isEditing && <th className="w-10 py-3 px-2" />}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {isEditing ? (
                                editRows.map((row, idx) => {
                                    const layerLetter = String.fromCharCode(64 + row.layer);
                                    const matchedBin = stack.bins.find(b => b.id === row.binId);
                                    return (
                                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="py-2 px-4">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-slate-700 text-slate-300 font-bold text-xs">{layerLetter}</span>
                                            </td>
                                            <td className="py-2 px-4">
                                                <input
                                                    type="text"
                                                    value={row.sku}
                                                    onChange={e => updateEditRow(idx, "sku", e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                                    placeholder="输入 SKU..."
                                                />
                                            </td>
                                            <td className="py-2 px-4">
                                                <input
                                                    type="number"
                                                    value={row.quantity}
                                                    onChange={e => updateEditRow(idx, "quantity", e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white font-bold text-center text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                                />
                                            </td>
                                            <td className="py-2 px-4 text-right text-slate-500 text-xs">
                                                {formatTime(matchedBin?.inboundTime ?? null)}
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                <button onClick={() => removeEditRow(idx)} className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                allRows.map((row, idx) => (
                                    <tr key={idx} className={clsx("transition-colors", row.isEmpty ? "text-slate-500" : "hover:bg-slate-800/40")}>
                                        <td className="py-2.5 px-4">
                                            <span className={clsx(
                                                "inline-flex items-center justify-center w-7 h-7 rounded font-bold text-xs",
                                                row.isEmpty ? "bg-slate-800 text-slate-600" : "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                                            )}>{row.layerLetter}</span>
                                        </td>
                                        <td className="py-2.5 px-4">
                                            {row.isEmpty
                                                ? <span className="italic text-slate-600">空</span>
                                                : <span className="font-mono font-semibold text-white">{row.sku}</span>
                                            }
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            {row.isEmpty
                                                ? <span className="text-slate-600">-</span>
                                                : <span className="font-bold text-indigo-400">{row.quantity}</span>
                                            }
                                        </td>
                                        <td className="py-2.5 px-4 text-right text-slate-500 text-xs font-mono">
                                            {formatTime(row.inboundTime)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {isEditing && (
                        <div className="p-3 border-t border-slate-800 flex flex-wrap gap-2">
                            {[...stack.bins].reverse().map(bin => {
                                const ll = String.fromCharCode(64 + bin.layer);
                                return (
                                    <button
                                        key={bin.id}
                                        onClick={() => addEditRow(bin.id, bin.layer)}
                                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> 添加到 {ll} 层
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {!isEditing && (
                    <div className="p-3 border-t border-slate-800 bg-slate-800/30 flex justify-between items-center text-xs text-slate-500">
                        <span>共 {allRows.filter(r => !r.isEmpty).length} 条 SKU</span>
                        <span>总数量: <strong className="text-indigo-400 text-sm">{allRows.reduce((s, r) => s + r.quantity, 0)}</strong></span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AdminLayoutPage() {
    const router = useRouter();
    const bins = useWarehouseStore(s => s.bins);
    const fetchBins = useWarehouseStore(s => s.fetchBins);
    const [selectedStack, setSelectedStack] = useState<BinStack | null>(null);

    useEffect(() => {
        if (bins.length === 0) {
            fetchBins();
        }
    }, [bins.length, fetchBins]);

    // Group bins into physical footprints (stacks)
    const stacksMap = new Map<string, BinStack>();
    bins.forEach(b => {
        const stackId = `${b.col}-${b.row}`;
        if (!stacksMap.has(stackId)) {
            stacksMap.set(stackId, { col: b.col, row: b.row, bins: [], hasItems: false });
        }
        const stack = stacksMap.get(stackId)!;
        stack.bins.push(b);
        if (b.quantity > 0) stack.hasItems = true;
    });

    // Ensure layers in each stack are sorted bottom-to-top or numerically
    stacksMap.forEach(stack => {
        stack.bins.sort((a, b) => a.layer - b.layer);
    });

    // Separate Stacks into Storage (row <= 13) and Staging (row > 13)
    const storageAisles: Record<string, BinStack[]> = {};
    const stagingStacks: BinStack[] = [];

    Array.from(stacksMap.values()).forEach(stack => {
        if (stack.row > 13) {
            // "暂存区不要显示那些空的编号" -> Only show if hasItems
            if (stack.hasItems) {
                stagingStacks.push(stack);
            }
        } else {
            if (!storageAisles[stack.col]) {
                storageAisles[stack.col] = [];
            }
            storageAisles[stack.col]!.push(stack);
        }
    });

    // Sort Aisles for Left/Right distribution
    const sortedAisleNames = Object.keys(storageAisles).sort();
    // midPoint / leftAisles / rightAisles 已被 orderedLeftAisles / orderedRightAisles 替代

    // Sort staging logically
    stagingStacks.sort((a, b) => {
        if (a.col !== b.col) return a.col.localeCompare(b.col);
        return a.row - b.row;
    });

    // Updated 2026-02-27T04:10:00Z - 缩小 bin 方块，移除 flex-shrink-0 以消除横向滚动条
    const renderStackSquare = (stack: BinStack, labelPrefix: string = "") => {
        return (
            <button
                key={`${stack.col}-${stack.row}`}
                onClick={() => setSelectedStack(stack)}
                title={`${stack.col} Row ${stack.row}`}
                className={clsx(
                    "w-8 h-8 aspect-square rounded text-xs font-bold flex items-center justify-center transition-all border outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm hover:-translate-y-0.5",
                    stack.hasItems
                        ? "bg-indigo-600 border-indigo-700 text-white shadow-md hover:bg-indigo-500"
                        : "bg-slate-100 border-slate-300 dark:bg-slate-800/80 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
            >
                {labelPrefix}{stack.row}
            </button>
        );
    };

    // 拖拽排序状态
    const [dragAisle, setDragAisle] = useState<string | null>(null);
    const [dragOverAisle, setDragOverAisle] = useState<string | null>(null);
    const [aisleOrder, setAisleOrder] = useState<string[]>([]);

    useEffect(() => {
        if (aisleOrder.length === 0 && sortedAisleNames.length > 0) {
            setAisleOrder(sortedAisleNames);
        }
    }, [sortedAisleNames, aisleOrder.length]);

    const orderedAisleNames = aisleOrder.length > 0 ? aisleOrder.filter(a => storageAisles[a]) : sortedAisleNames;
    const orderedMidPoint = Math.ceil(orderedAisleNames.length / 2);
    const orderedLeftAisles = orderedAisleNames.slice(0, orderedMidPoint);
    const orderedRightAisles = orderedAisleNames.slice(orderedMidPoint);

    const handleDragStart = (colName: string) => {
        setDragAisle(colName);
    };

    const handleDragOver = (e: React.DragEvent, colName: string) => {
        e.preventDefault();
        if (colName !== dragAisle) setDragOverAisle(colName);
    };

    const handleDrop = (colName: string) => {
        if (dragAisle && dragAisle !== colName) {
            const newOrder = [...orderedAisleNames];
            const fromIdx = newOrder.indexOf(dragAisle);
            const toIdx = newOrder.indexOf(colName);
            if (fromIdx >= 0 && toIdx >= 0) {
                newOrder.splice(fromIdx, 1);
                newOrder.splice(toIdx, 0, dragAisle);
                setAisleOrder(newOrder);
            }
        }
        setDragAisle(null);
        setDragOverAisle(null);
    };

    const handleDragEnd = () => {
        setDragAisle(null);
        setDragOverAisle(null);
    };

    // Updated 2026-02-27T04:12:00Z - 容器级 onDragOver 允许跨左右区域拖放
    const renderStorageBlock = (aisleCols: string[]) => (
        <div
            className="flex flex-col gap-3 w-full"
            onDragOver={(e) => e.preventDefault()}
        >
            {aisleCols.map(colName => {
                const stacks = storageAisles[colName] || [];
                stacks.sort((a, b) => a.row - b.row);
                const isDragging = dragAisle === colName;
                const isDragOver = dragOverAisle === colName;
                return (
                    <div
                        key={colName}
                        draggable
                        onDragStart={() => handleDragStart(colName)}
                        onDragOver={(e) => handleDragOver(e, colName)}
                        onDrop={() => handleDrop(colName)}
                        onDragEnd={handleDragEnd}
                        className={clsx(
                            "flex flex-row items-center border rounded-lg bg-white dark:bg-slate-800 p-2 shadow-sm transition-all cursor-grab active:cursor-grabbing",
                            isDragging && "opacity-40 scale-95",
                            isDragOver && "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/5",
                            !isDragging && !isDragOver && "border-slate-200 dark:border-slate-700"
                        )}
                    >
                        <div className="w-12 flex-shrink-0 flex items-center justify-center border-r border-slate-100 dark:border-slate-700 pr-2 mr-2 gap-0.5">
                            <GripVertical className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">{colName}</h3>
                        </div>
                        <div className="flex flex-row flex-wrap gap-1 py-0.5 min-w-0">
                            {stacks.map(st => renderStackSquare(st))}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="flex-1 flex flex-col p-6 h-[calc(100vh-80px)] overflow-hidden bg-slate-950 relative">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Home
                    </button>
                    <h2 className="text-2xl font-bold text-white">
                        2D Warehouse Floor Map
                    </h2>
                </div>
                <div className="text-sm font-mono text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                    Total Physical Stacks: {stacksMap.size}
                </div>
            </div>

            {/* Warehouse Map Container */}
            <div className="flex-1 overflow-auto rounded-xl bg-[#111111] border border-slate-800 p-8 flex flex-col items-center relative">
                {bins.length === 0 ? (
                    <div className="flex items-center justify-center w-full h-full text-slate-500 animate-pulse">
                        Loading physical layout from database...
                    </div>
                ) : (
                    <div className="w-full max-w-[1400px] flex flex-col items-center gap-12 relative pb-20">

                        {/* 暂存区 - Temporary Staging Area */}
                        <div className="w-full border-2 border-sky-500/50 rounded-xl p-6 bg-sky-900/10 relative ml-[15%] max-w-3xl shadow-lg border-dashed">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sky-500 text-white px-6 py-1.5 rounded-md font-bold text-sm shadow-md">
                                暂存区 (Staging Area)
                            </div>
                            <div className="flex flex-wrap gap-3 justify-center mt-2">
                                {stagingStacks.length === 0 ? (
                                    <span className="text-slate-500 italic py-4">No occupied staging bins</span>
                                ) : (
                                    stagingStacks.map(st => renderStackSquare(st, `${st.col}-`))
                                )}
                            </div>
                        </div>

                        {/* Main Floor Zones with Center Aisle */}
                        <div className="flex w-full relative min-h-[500px]">

                            {/* Updated 2026-02-27T04:12:00Z - 左右区域容器支持跨区域 drop */}
                            {/* Left Storage */}
                            <div
                                className="w-[42%] flex justify-end pr-4"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                    if (dragAisle && !orderedLeftAisles.includes(dragAisle)) {
                                        const newOrder = orderedAisleNames.filter(a => a !== dragAisle);
                                        newOrder.splice(orderedMidPoint - 1, 0, dragAisle);
                                        setAisleOrder(newOrder);
                                        setDragAisle(null);
                                        setDragOverAisle(null);
                                    }
                                }}
                            >
                                {renderStorageBlock(orderedLeftAisles)}
                            </div>

                            {/* Center Main Aisle */}
                            <div className="w-[16%] flex flex-col items-center relative z-0">
                                <div className="absolute inset-y-0 w-full border-x-2 border-dashed border-emerald-500/50 bg-emerald-500/5" />
                                <div className="sticky top-1/2 -translate-y-1/2 bg-red-600 text-white font-black py-4 px-3 rounded shadow-xl z-10 [writing-mode:vertical-lr] tracking-[0.5em] text-xl">
                                    主车道
                                </div>
                            </div>

                            {/* Right Storage */}
                            <div
                                className="w-[42%] flex justify-start pl-4 pt-20"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                    if (dragAisle && !orderedRightAisles.includes(dragAisle)) {
                                        const newOrder = orderedAisleNames.filter(a => a !== dragAisle);
                                        newOrder.push(dragAisle);
                                        setAisleOrder(newOrder);
                                        setDragAisle(null);
                                        setDragOverAisle(null);
                                    }
                                }}
                            >
                                {renderStorageBlock(orderedRightAisles)}
                            </div>
                        </div>

                        <p className="text-center text-xs text-slate-500 mt-2">
                            Drag aisles to rearrange layout
                        </p>
                    </div>
                )}
            </div>

            {/* Updated 2026-02-27T04:35:00Z - 表格形式展示 SKU/数量/入库时间，支持编辑 */}
            {selectedStack && (
                <StackDetailModal
                    stack={selectedStack}
                    onClose={() => setSelectedStack(null)}
                />
            )}
        </div>
    );
}
