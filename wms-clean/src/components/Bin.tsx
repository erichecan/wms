"use client";

// Updated 2026-02-27T06:05:00Z - 支持多 SKU 显示/编辑；Portal 弹窗；e.target 类型断言修复
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Edit2, Check, X, QrCode, Package, Hash, Plus, Trash2, Camera, ArrowRight } from "lucide-react";
import { SkuPhotoOcr } from "./SkuPhotoOcr";
import { type Bin as BinType, type BinItem, type WarehouseState, useWarehouseStore } from "@/store/warehouseStore";
import { QRCodeCanvas } from "qrcode.react";
import clsx from "clsx";

// 单行 SKU：数量 + 时钟图标 + 移动到按钮 - 2026-02-27 深色弹窗内高对比度
function SkuRowWithTime({ sku, quantity, inboundTime, onMove }: { sku: string; quantity: number; inboundTime: string | null; onMove?: () => void }) {
    const [showTime, setShowTime] = useState(false);
    const timeStr = inboundTime ? new Date(inboundTime).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }) : "-";
    return (
        <div className="bg-zinc-700/60 p-3 rounded-xl border border-zinc-600 flex items-center justify-between gap-3">
            <span className="font-mono font-bold text-sm flex-1 text-zinc-100">{sku}</span>
            <span className="font-bold text-lg text-[#e85a3a] w-14 text-right">{quantity}</span>
            <div className="flex items-center gap-1">
                {onMove && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onMove(); }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#D94828] hover:bg-[#b83d22] text-white text-xs font-medium transition-colors cursor-pointer"
                        title="移动到其他托盘"
                    >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>移动到</span>
                    </button>
                )}
                <div
                    className="relative shrink-0 inline-flex"
                    onClick={() => setShowTime(!showTime)}
                    onMouseEnter={() => setShowTime(true)}
                    onMouseLeave={() => setShowTime(false)}
                >
                    <button
                        type="button"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-600 hover:bg-zinc-500 cursor-pointer transition-colors"
                        title={timeStr}
                    >
                        <Clock className="w-4 h-4 text-zinc-300" />
                    </button>
                    {showTime && (
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 bg-zinc-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg border border-zinc-600">
                            {timeStr}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

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
    const [showQr, setShowQr] = useState(false);
    const [showPhotoOcr, setShowPhotoOcr] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const items: BinItem[] = bin.items?.length > 0
        ? bin.items
        : bin.sku ? [{ sku: bin.sku, quantity: bin.quantity }] : [];
    const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
    const hasItems = totalQty > 0;

    const updateBin = useWarehouseStore((s: WarehouseState) => s.updateBin);
    const setPendingSkuMove = useWarehouseStore((s: WarehouseState) => s.setPendingSkuMove);

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
        const cur = updated[idx];
        if (field === "sku") updated[idx] = { sku: value as string, quantity: cur?.quantity ?? 0 };
        else updated[idx] = { sku: cur?.sku ?? "", quantity: Number(value) };
        setEditItems(updated);
    };

    const formattedId = `${bin.col}-${bin.row}-${String.fromCharCode(64 + bin.rack)}`;

    return (
        <>
            <motion.div
                layout
                className={clsx(
                    "relative w-full h-full min-h-[40px] rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-colors shadow-sm",
                    isSelected ? "bg-[#D94828]/30 border-[#D94828] shadow-[#D94828]/20 shadow-lg"
                        : hasItems ? "bg-[#D94828] border-[#b83d22] shadow-md hover:bg-[#b83d22]"
                            : "bg-zinc-50 dark:bg-zinc-800/50 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#D94828]"
                )}
            >
                <span className={clsx(
                    "text-[10px] font-mono font-bold px-0.5 text-center leading-tight",
                    hasItems ? "text-white" : "text-zinc-400"
                )}>
                    {formattedId.split('-').slice(1).join('-')}
                </span>
                {items.length > 1 && (
                    <span className="text-[8px] text-white/80 font-mono">{items.length} SKU</span>
                )}
            </motion.div>

            {mounted && createPortal(
                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
                            onClick={() => closeModal()}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                onClick={e => e.stopPropagation()}
                                className="relative w-full max-w-md rounded-2xl overflow-hidden p-6 bg-zinc-800 border border-zinc-700 shadow-2xl max-h-[85vh] overflow-y-auto text-zinc-100"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-2xl font-bold font-mono text-[#D94828]">{formattedId}</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowQr(!showQr)}
                                            className={clsx(
                                                "p-2 rounded-lg transition-colors",
                                                showQr ? "bg-[#D94828] text-white" : "bg-zinc-600/80 text-zinc-200 hover:bg-zinc-600 hover:text-white"
                                            )}
                                            title="View QR Label"
                                        >
                                            <QrCode className="w-5 h-5" />
                                        </button>
                                        {!isEditing ? (
                                            <button
                                                onClick={startEditing}
                                                className="p-2 bg-zinc-600/80 rounded-lg text-zinc-200 hover:bg-zinc-600 hover:text-white transition-colors cursor-pointer"
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

                                <p className="text-zinc-400 text-sm mb-4 font-mono">System ID: {bin.id}</p>

                                {showQr && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        className="mb-4 bg-white p-4 rounded-xl flex flex-col items-center justify-center space-y-2"
                                    >
                                        <QRCodeCanvas value={formattedId} size={150} />
                                        <span className="text-black text-xs font-mono font-bold">{formattedId}</span>
                                    </motion.div>
                                )}

                                {/* 总数量 */}
                                <div className="bg-zinc-700/60 p-3 rounded-xl border border-zinc-600 flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-zinc-300 text-sm">
                                        <Hash className="w-4 h-4" />
                                        <span>Total Qty</span>
                                    </div>
                                    <span className="font-bold text-2xl text-white">{isEditing ? editItems.reduce((s, i) => s + i.quantity, 0) : totalQty}</span>
                                </div>

                                {/* 托盘上所有货物：SKU、数量、入库时间（时钟+悬停/点击显示）- 2026-02-27T08:40:00Z */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2 text-zinc-300 text-sm">
                                            <Package className="w-4 h-4" />
                                            <span>SKU 列表 ({isEditing ? editItems.length : items.length})</span>
                                        </div>
                                        {isEditing && (
                                            <div className="flex gap-2">
                                                <button onClick={addItem} className="flex items-center gap-1 text-xs text-[#D94828] hover:text-[#b83d22] transition-colors cursor-pointer">
                                                    <Plus className="w-3 h-3" /> Add SKU
                                                </button>
                                                <button onClick={() => setShowPhotoOcr(!showPhotoOcr)} className="flex items-center gap-1 text-xs text-[#D94828] hover:text-[#b83d22] transition-colors cursor-pointer">
                                                    <Camera className="w-3 h-3" /> 拍照识别
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {isEditing && showPhotoOcr && (
                                        <SkuPhotoOcr
                                            onExtract={(extracted) => {
                                                const valid = extracted.filter(i => i.sku.trim());
                                                setEditItems(prev => [...prev.filter(i => i.sku.trim()), ...valid]);
                                                setShowPhotoOcr(false);
                                            }}
                                            onClose={() => setShowPhotoOcr(false)}
                                        />
                                    )}

                                    {isEditing ? (
                                        editItems.map((item, idx) => (
                                            <div key={idx} className="bg-zinc-700/60 p-3 rounded-xl border border-zinc-600 flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={item.sku}
                                                    onChange={e => updateItem(idx, "sku", String((e.target as { value?: string }).value ?? ""))}
                                                    className="flex-1 bg-zinc-600 border border-zinc-500 rounded-lg px-2 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-[#D94828]"
                                                    placeholder="SKU..."
                                                />
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, "quantity", Number((e.target as { value?: string }).value) || 0)}
                                                    className="w-20 bg-zinc-600 border border-zinc-500 rounded-lg px-2 py-1.5 text-white font-bold text-center focus:outline-none focus:border-[#D94828]"
                                                />
                                                <button onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        items.length > 0 ? items.map((item, idx) => (
                                            <SkuRowWithTime
                                                key={idx}
                                                sku={item.sku}
                                                quantity={item.quantity}
                                                inboundTime={bin.inboundTime}
                                                onMove={() => {
                                                    setPendingSkuMove({ sourceBinId: bin.id, sku: item.sku, quantity: item.quantity });
                                                    closeModal();
                                                }}
                                            />
                                        )) : (
                                            <div className="bg-zinc-700/40 p-4 rounded-xl border border-zinc-600 text-center text-zinc-400 italic">
                                                Empty Bin
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* 入库时间已合并到每行 SKU 的时钟图标 */}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
