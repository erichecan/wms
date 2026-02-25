"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Edit2, Check, X, QrCode, Camera, Package, Hash } from "lucide-react";
import { type Bin as BinType, type WarehouseState, useWarehouseStore } from "@/store/warehouseStore";
import { QRCodeCanvas } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import clsx from "clsx";

interface BinProps {
    bin: BinType;
}

export function Bin({ bin }: BinProps) {
    const selectBin = useWarehouseStore((s: WarehouseState) => s.selectBin);
    const toggleBinSelection = useWarehouseStore((s: WarehouseState) => s.toggleBinSelection);
    const selectedBinIds = useWarehouseStore((s: WarehouseState) => s.selectedBinIds);

    const isSelected = selectedBinIds.includes(bin.id);
    const isMultiSelecting = selectedBinIds.length > 1;

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [editSku, setEditSku] = useState(bin.sku || "");
    const [editQty, setEditQty] = useState(bin.quantity);
    const [showTime, setShowTime] = useState(false);
    const [showQr, setShowQr] = useState(false);
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

    const updateBin = useWarehouseStore((s: WarehouseState) => s.updateBin);

    const handleSave = async () => {
        setIsEditing(false); // Immediate UI feedback
        await updateBin(bin.id, {
            sku: editSku || null,
            quantity: Number(editQty)
        });
    };

    const handleCancel = () => {
        setEditSku(bin.sku || "");
        setEditQty(bin.quantity);
        setIsEditing(false);
    };

    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;
        if (isScanning) {
            scanner = new Html5QrcodeScanner(
                "scanner-reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );
            scanner.render((decodedText) => {
                setEditSku(decodedText);
                setIsScanning(false);
                if (scanner) scanner.clear();
            }, (error) => {
                // Ignore errors
            });
        }
        return () => {
            if (scanner) {
                scanner.clear().catch(e => console.error("Scanner clear failed", e));
            }
        };
    }, [isScanning]);

    // Mock "AI Recognition" for handwriting/photo
    const handleAiRecognize = () => {
        // In a real app, this would upload an image to an AI service
        alert("📸 开始拍照识别...\n1. 识别箱子上的 SKU 标签\n2. 识别入库单上的手写库位 (" + bin.id + ")");
        setTimeout(() => {
            const detectedSku = "SKU-PRO-" + (Math.floor(Math.random() * 900) + 100);
            const detectedQty = Math.floor(Math.random() * 100) + 1;

            setEditSku(detectedSku);
            setEditQty(detectedQty);

            alert("✅ 识别成功！\n\n识别到的 SKU: " + detectedSku + "\n识别到的数量: " + detectedQty + "\n库位校准: " + bin.id);
        }, 1500);
    };

    const formattedId = `${bin.col}-${bin.row}-${String.fromCharCode(64 + bin.layer)}`;

    return (
        <>
            <motion.div
                layout
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                className={clsx(
                    "relative w-full h-full min-h-[50px] min-w-[50px] rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors shadow-sm",
                    isSelected ? "bg-indigo-500/30 border-indigo-500 shadow-indigo-500/20 shadow-lg"
                        : bin.quantity > 0 ? "bg-indigo-600 border-indigo-700 shadow-md hover:bg-indigo-500"
                            : "bg-slate-50 dark:bg-slate-800/50 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400" // Empty state
                )}
            >
                {/* ID indicator for context */}
                <span className={clsx(
                    "text-[11px] font-mono font-bold px-1 text-center",
                    bin.quantity > 0 ? "text-white" : "text-slate-400"
                )}>
                    {formattedId.split('-').slice(1).join('-')} {/* Only show Row-Layer like 1-A */}
                </span>
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
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold font-mono text-indigo-400">{formattedId}</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowQr(!showQr)}
                                        className={clsx(
                                            "p-2 rounded-lg transition-colors",
                                            showQr ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-400 hover:text-white"
                                        )}
                                        title="View QR Label"
                                    >
                                        <QrCode className="w-5 h-5" />
                                    </button>
                                    {!isEditing ? (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="p-2 bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={handleSave}
                                                className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                            >
                                                <Check className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={handleCancel}
                                                className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <p className="opacity-70 text-sm mb-6 font-mono">System ID: {bin.id}</p>

                            {showQr && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    className="mb-6 bg-white p-4 rounded-xl flex flex-col items-center justify-center space-y-2 dark:bg-white"
                                >
                                    <QRCodeCanvas value={formattedId} size={150} />
                                    <span className="text-black text-xs font-mono font-bold">{formattedId}</span>
                                </motion.div>
                            )}

                            {isScanning && (
                                <div className="mb-6 rounded-xl overflow-hidden border border-indigo-500/30 bg-black/20">
                                    <div id="scanner-reader" className="w-full"></div>
                                    <button
                                        onClick={() => setIsScanning(false)}
                                        className="w-full py-2 bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                                    >
                                        Cancel Scanning
                                    </button>
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* SKU Section */}
                                <div className="bg-white/10 p-4 rounded-xl border border-white/10 flex flex-col space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 opacity-80 text-sm">
                                            <Package className="w-4 h-4" />
                                            <span>SKU</span>
                                        </div>
                                        {isEditing && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setIsScanning(true)}
                                                    className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-md hover:bg-indigo-500/30"
                                                    title="Scan Barcode"
                                                >
                                                    <Camera className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={handleAiRecognize}
                                                    className="p-1.5 bg-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/30"
                                                    title="AI Photo Recognition"
                                                >
                                                    <QrCode className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editSku}
                                            onChange={e => setEditSku(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                                            placeholder="Enter SKU..."
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="font-mono font-bold tracking-tight text-lg">
                                            {bin.sku || "N/A"}
                                        </span>
                                    )}
                                </div>

                                {/* Quantity Section */}
                                <div className="bg-white/10 p-4 rounded-xl border border-white/10 flex flex-col space-y-2">
                                    <div className="flex items-center gap-2 opacity-80 text-sm">
                                        <Hash className="w-4 h-4" />
                                        <span>Quantity</span>
                                    </div>
                                    {isEditing ? (
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                value={editQty}
                                                onChange={e => setEditQty(Number(e.target.value))}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white font-bold text-xl focus:outline-none focus:border-indigo-500"
                                            />
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setEditQty(Math.max(0, editQty - 1))}
                                                    className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
                                                >
                                                    -
                                                </button>
                                                <button
                                                    onClick={() => setEditQty(editQty + 1)}
                                                    className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="font-bold text-3xl">{bin.quantity}</span>
                                    )}
                                </div>

                                {/* Time Section */}
                                {bin.inboundTime && (
                                    <div
                                        className="bg-white/10 p-4 rounded-xl border border-white/10 flex flex-col space-y-1 cursor-pointer group"
                                        onClick={() => setShowTime(!showTime)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 opacity-80 text-sm">
                                                <Clock className="w-4 h-4" />
                                                <span>Inbound Time</span>
                                            </div>
                                            <Clock className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
                                        </div>
                                        <AnimatePresence>
                                            {showTime && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="text-sm font-mono text-indigo-200 pt-2"
                                                >
                                                    {new Date(bin.inboundTime).toLocaleString()}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
