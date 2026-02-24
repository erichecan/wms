"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import { Bin as BinType, useWarehouseStore } from "@/store/warehouseStore";
import clsx from "clsx";

interface BinProps {
    bin: BinType;
}

export function Bin({ bin }: BinProps) {
    const selectBin = useWarehouseStore(s => s.selectBin);
    const toggleBinSelection = useWarehouseStore(s => s.toggleBinSelection);
    const selectedBinIds = useWarehouseStore(s => s.selectedBinIds);

    const isSelected = selectedBinIds.includes(bin.id);
    const isMultiSelecting = selectedBinIds.length > 1;

    const [showModal, setShowModal] = useState(false);
    const [showTime, setShowTime] = useState(false);
    const pressTimer = useRef<NodeJS.Timeout | null>(null);

    const handlePointerDown = () => {
        pressTimer.current = setTimeout(() => {
            // Long press triggered (multi-select mode)
            toggleBinSelection(bin.id);
            pressTimer.current = null;
        }, 1000); // 1s for long press is more responsive than 3s
    };

    const handlePointerUp = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            // Short click
            if (isMultiSelecting) {
                // If already in multi-select mode, clicking toggles selection
                toggleBinSelection(bin.id);
            } else {
                // Normal click => show details
                selectBin(bin.id);
                setShowModal(true);
            }
        }
    };

    const handlePointerLeave = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };

    return (
        <>
            <motion.div
                layout
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                className={clsx(
                    "relative w-full h-full min-h-[60px] min-w-[60px] rounded-lg border flex items-center justify-center cursor-pointer transition-colors shadow-sm",
                    isSelected ? "bg-indigo-500/30 border-indigo-500 shadow-indigo-500/20 shadow-lg" : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-indigo-400"
                )}
            >
                {/* Layer indicator for 3D view context */}
                <span className="absolute top-1 right-1 text-[10px] text-slate-400">L{bin.layer}</span>

                {/* SKU indicator if exists */}
                {bin.quantity > 0 && (
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{bin.quantity}</span>
                        </div>
                        <span className="text-[10px] mt-1 text-slate-500 truncate max-w-full text-center px-1">
                            {bin.sku}
                        </span>
                    </div>
                )}
            </motion.div>

            {/* Glassmorphic Modal overlay */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="glass relative w-full max-w-sm rounded-2xl overflow-hidden p-6 text-slate-900 dark:text-white"
                        >
                            <h3 className="text-2xl font-bold mb-1">Bin {bin.id}</h3>
                            <p className="opacity-70 text-sm mb-6">Column {bin.col} | Row {bin.row} | Layer {bin.layer}</p>

                            {bin.quantity > 0 ? (
                                <div className="space-y-4">
                                    <div className="bg-white/10 p-4 rounded-xl border border-white/10 flex justify-between items-center">
                                        <span className="opacity-80">SKU</span>
                                        <span className="font-mono font-bold tracking-tight">{bin.sku}</span>
                                    </div>
                                    <div className="bg-white/10 p-4 rounded-xl border border-white/10 flex justify-between items-center">
                                        <span className="opacity-80">Quantity</span>
                                        <span className="font-bold text-xl">{bin.quantity}</span>
                                    </div>
                                    <div className="bg-white/10 p-4 rounded-xl border border-white/10 flex justify-between items-center relative cursor-pointer group" onClick={() => setShowTime(!showTime)}>
                                        <div className="flex flex-col w-full">
                                            <div className="flex justify-between items-center">
                                                <span className="opacity-80">Inbound Time</span>
                                                <Clock className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                                            </div>
                                            <AnimatePresence>
                                                {showTime && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                                        animate={{ height: "auto", opacity: 1, marginTop: 8 }}
                                                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                                        className="text-sm font-mono text-indigo-200"
                                                    >
                                                        {new Date(bin.inboundTime!).toLocaleString()}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center opacity-50 border border-dashed rounded-xl border-white/20">
                                    This bin is currently empty.
                                </div>
                            )}

                            <button
                                onClick={() => setShowModal(false)}
                                className="mt-6 w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
                            >
                                Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
