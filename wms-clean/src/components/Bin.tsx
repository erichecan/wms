"use client";

// Updated 2026-02-27T03:56:00Z - 支持多 SKU 显示/编辑；Portal 弹窗；modal 由外部 props 控制
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Edit2, Check, X, QrCode, Package, Hash, Plus, Trash2 } from "lucide-react";
import { type Bin as BinType, type BinItem, type WarehouseState, useWarehouseStore } from "@/store/warehouseStore";
import { QRCodeCanvas } from "qrcode.react";
import clsx from "clsx";

interface BinProps {
    bin: BinType;
    showModal?: boolean;
    onCloseModal?: () => void;
}

export function Bin({ bin, showModal: externalShowModal, onCloseModal }: BinProps) {
    const selectedBinIds = useWarehouseStore((s: WarehouseState) => s.selectedBinIds);
    const isSelected = selectedBinIds.includes(bin.id);

    const showModal = externalShowModal ?? false;
    const closeModal = onCloseModal ?? (() => {});

    const [isEditing, setIsEditing] = useState(false);
    const [editItems, setEditItems] = useState<BinItem[]>([]);
    const [showTime, setShowTime] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const items: BinItem[] = bin.items?.length > 0
        ? bin.items
        : bin.sku ? [{ sku: bin.sku, quantity: bin.quantity }] : [];
    const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
    const hasItems = totalQty > 0;

    const updateBin = useWarehouseStore((s: WarehouseState) => s.updateBin);

    const startEditing = () => {
        setEditItems(items.length > 0 ? [...items.map(i => ({ ...i }))] : [{ sku: "", quantity: 0 }]);
        setIsEditing(true);
    };

    const handleSave = async () => {
        setIsEditing(false);
        const validItems = editItems.filter(i => i.sku.trim());
        const totalQuantity = validItems.reduce((sum, i) => sum + i.quantity, 0);
        await updateBin(bin.id, {
            items: validItems,
            sku: validItems[0]?.sku || null,
            quantity: totalQuantity,
        });
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const addItem = () => {
        setEditItems([...editItems, { sku: "", quantity: 0 }]);
    };

    const removeItem = (idx: number) => {
        setEditItems(editItems.filter((_, i) => i !== idx));
    };

    const updateItem = (idx: number, field: keyof BinItem, value: string | number) => {
        const updated = [...editItems];
        if (field === "sku") updated[idx] = { ...updated[idx], sku: value as string };
        else updated[idx] = { ...updated[idx], quantity: Number(value) };
        setEditItems(updated);
    };

    const formattedId = `${bin.col}-${bin.row}-${String.fromCharCode(64 + bin.layer)}`;

    return (
        <>
            <motion.div
                layout
                className={clsx(
                    "relative w-full h-full min-h-[40px] rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-colors shadow-sm",
                    isSelected ? "bg-indigo-500/30 border-indigo-500 shadow-indigo-500/20 shadow-lg"
                        : hasItems ? "bg-indigo-600 border-indigo-700 shadow-md hover:bg-indigo-500"
                            : "bg-slate-50 dark:bg-slate-800/50 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400"
                )}
            >
                <span className={clsx(
                    "text-[10px] font-mono font-bold px-0.5 text-center leading-tight",
                    hasItems ? "text-white" : "text-slate-400"
                )}>
                    {formattedId.split('-').slice(1).join('-')}
                </span>
                {items.length > 1 && (
                    <span className="text-[8px] text-indigo-200 font-mono">{items.length} SKU</span>
                )}
            </motion.div>

            {mounted && createPortal(
                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                            onClick={() => closeModal()}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                onClick={e => e.stopPropagation()}
                                className="glass relative w-full max-w-md rounded-2xl overflow-hidden p-6 text-slate-900 dark:text-white max-h-[85vh] overflow-y-auto"
                            >
                                <div className="flex justify-between items-center mb-4">
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
                                                onClick={startEditing}
                                                className="p-2 bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <div className="flex gap-1">
                                                <button onClick={handleSave} className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors">
                                                    <Check className="w-5 h-5" />
                                                </button>
                                                <button onClick={handleCancel} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <p className="opacity-70 text-sm mb-4 font-mono">System ID: {bin.id}</p>

                                {showQr && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        className="mb-4 bg-white p-4 rounded-xl flex flex-col items-center justify-center space-y-2 dark:bg-white"
                                    >
                                        <QRCodeCanvas value={formattedId} size={150} />
                                        <span className="text-black text-xs font-mono font-bold">{formattedId}</span>
                                    </motion.div>
                                )}

                                {/* 总数量 */}
                                <div className="bg-white/10 p-3 rounded-xl border border-white/10 flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 opacity-80 text-sm">
                                        <Hash className="w-4 h-4" />
                                        <span>Total Qty</span>
                                    </div>
                                    <span className="font-bold text-2xl">{isEditing ? editItems.reduce((s, i) => s + i.quantity, 0) : totalQty}</span>
                                </div>

                                {/* SKU 列表 */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2 opacity-80 text-sm">
                                            <Package className="w-4 h-4" />
                                            <span>SKU Items ({isEditing ? editItems.length : items.length})</span>
                                        </div>
                                        {isEditing && (
                                            <button onClick={addItem} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                                                <Plus className="w-3 h-3" /> Add SKU
                                            </button>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        editItems.map((item, idx) => (
                                            <div key={idx} className="bg-white/10 p-3 rounded-xl border border-white/10 flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={item.sku}
                                                    onChange={e => updateItem(idx, "sku", e.target.value)}
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                                                    placeholder="SKU..."
                                                />
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, "quantity", e.target.value)}
                                                    className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white font-bold text-center focus:outline-none focus:border-indigo-500"
                                                />
                                                <button onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        items.length > 0 ? items.map((item, idx) => (
                                            <div key={idx} className="bg-white/10 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                                                <span className="font-mono font-bold text-sm">{item.sku}</span>
                                                <span className="font-bold text-lg text-indigo-300">{item.quantity}</span>
                                            </div>
                                        )) : (
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center text-slate-500 italic">
                                                Empty Bin
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Time Section */}
                                {bin.inboundTime && (
                                    <div
                                        className="bg-white/10 p-3 rounded-xl border border-white/10 flex flex-col space-y-1 cursor-pointer group mt-4"
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
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
