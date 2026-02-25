"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, X, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWarehouseStore, type Bin } from "@/store/warehouseStore";
import clsx from "clsx";

interface BinStack {
    col: string;
    row: number;
    bins: Bin[];
    hasItems: boolean;
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
    const midPoint = Math.ceil(sortedAisleNames.length / 2);
    const leftAisles = sortedAisleNames.slice(0, midPoint);
    const rightAisles = sortedAisleNames.slice(midPoint);

    // Sort staging logically
    stagingStacks.sort((a, b) => {
        if (a.col !== b.col) return a.col.localeCompare(b.col);
        return a.row - b.row;
    });

    const renderStackSquare = (stack: BinStack, labelPrefix: string = "") => {
        return (
            <button
                key={`${stack.col}-${stack.row}`}
                onClick={() => setSelectedStack(stack)}
                title={`${stack.col} Row ${stack.row}`}
                className={clsx(
                    "w-10 h-10 md:w-12 md:h-12 flex-shrink-0 aspect-square rounded-md text-sm font-bold flex items-center justify-center transition-all border-2 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm hover:-translate-y-0.5",
                    stack.hasItems
                        ? "bg-indigo-600 border-indigo-700 text-white shadow-md hover:bg-indigo-500 hover:shadow-lg"
                        : "bg-slate-100 border-slate-300 dark:bg-slate-800/80 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
            >
                {labelPrefix}{stack.row}
            </button>
        );
    };

    const renderStorageBlock = (aisleCols: string[]) => (
        <div className="flex flex-col gap-6 w-full">
            {aisleCols.map(colName => {
                const stacks = storageAisles[colName] || [];
                stacks.sort((a, b) => a.row - b.row);
                return (
                    <div key={colName} className="flex flex-row items-center border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 p-3 shadow-md">
                        {/* Title block on the left */}
                        <div className="w-16 flex-shrink-0 flex items-center justify-center border-r-2 border-slate-100 dark:border-slate-700 pr-3 mr-3">
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{colName}</h3>
                        </div>
                        {/* Horizontal row of square cells */}
                        <div className="flex flex-row flex-nowrap overflow-x-auto gap-2 py-1 scrollbar-hide">
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

                            {/* Left Storage */}
                            <div className="w-[42%] flex justify-end pr-8">
                                {renderStorageBlock(leftAisles)}
                            </div>

                            {/* Center Main Aisle */}
                            <div className="w-[16%] flex flex-col items-center relative z-0">
                                <div className="absolute inset-y-0 w-full border-x-2 border-dashed border-emerald-500/50 bg-emerald-500/5" />
                                <div className="sticky top-1/2 -translate-y-1/2 bg-red-600 text-white font-black py-4 px-3 rounded shadow-xl z-10 [writing-mode:vertical-lr] tracking-[0.5em] text-xl">
                                    主车道
                                </div>
                            </div>

                            {/* Right Storage */}
                            <div className="w-[42%] flex justify-start pl-8 pt-20">
                                {renderStorageBlock(rightAisles)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Top-Down Stack Details Modal */}
            {selectedStack && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-700">
                        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-800/50">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <Layers className="w-6 h-6 text-indigo-400" />
                                Details: Aisle {selectedStack.col} - Row {selectedStack.row}
                            </h3>
                            <button
                                onClick={() => setSelectedStack(null)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-slate-400 mb-4 font-medium uppercase tracking-wider">Vertical Layers (Top to Bottom)</p>
                            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {/* Map backwards to show highest layer visually at top */}
                                {[...selectedStack.bins].reverse().map(bin => {
                                    const layerLetter = String.fromCharCode(64 + bin.layer);
                                    const hasItems = bin.quantity > 0;
                                    const displayId = `${bin.col}-${bin.row}-${layerLetter}`;
                                    return (
                                        <div
                                            key={bin.id}
                                            className={clsx(
                                                "p-4 rounded-xl border flex items-center justify-between transition-all",
                                                hasItems
                                                    ? "bg-indigo-900/40 border-indigo-700/50"
                                                    : "bg-slate-800/50 border-slate-700/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-600 flex items-center justify-center font-bold text-slate-300">
                                                    {layerLetter}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs text-slate-500 mb-0.5">{displayId}</span>
                                                    {hasItems ? (
                                                        <span className="font-bold text-white text-lg">{bin.sku}</span>
                                                    ) : (
                                                        <span className="italic text-slate-500 font-medium">Empty Cell</span>
                                                    )}
                                                </div>
                                            </div>
                                            {hasItems && (
                                                <div className="bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 rounded-lg flex flex-col items-center justify-center">
                                                    <span className="text-[10px] uppercase text-indigo-300 font-bold mb-0.5">QTY</span>
                                                    <span className="text-xl font-black text-indigo-400 leading-none">{bin.quantity}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
