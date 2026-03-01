// Updated 2026-02-27T05:25:00Z - 拍照箱标/入库单，OCR 识别 SKU
"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, X } from "lucide-react";
import type { BinItem } from "@/store/warehouseStore";

interface SkuPhotoOcrProps {
    onExtract: (items: BinItem[]) => void;
    onClose: () => void;
}

/** 从 OCR 文本提取 SKU 与数量：支持箱标、入库单常见格式 */
function parseOcrText(text: string): BinItem[] {
    const items: BinItem[] = [];
    const seen = new Set<string>();
    const lines = text.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
    const skuPattern = /[A-Za-z0-9][A-Za-z0-9\-_\.]{3,24}/g;
    const numPattern = /\d+/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const skuCandidates = line.match(skuPattern) || [];
        const nums = line.match(/\d+/g);
        const lastNum = nums?.[nums.length - 1];
        const qty = lastNum != null ? parseInt(lastNum, 10) : 1;

        for (const sku of skuCandidates) {
            const normalized = sku.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
            if (normalized.length >= 4 && !seen.has(normalized) && !/^\d+$/.test(normalized)) {
                seen.add(normalized);
                items.push({ sku: normalized, quantity: Math.min(qty, 9999) || 1 });
            }
        }
        if (skuCandidates.length === 0 && nums && line.length < 30) {
            const nextLine = lines[i + 1];
            if (nextLine) {
                const nextSkus = nextLine.match(skuPattern) || [];
                for (const sku of nextSkus) {
                    const normalized = sku.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
                    if (normalized.length >= 4 && !seen.has(normalized)) {
                        seen.add(normalized);
                        items.push({ sku: normalized, quantity: Math.min(qty, 9999) || 1 });
                    }
                }
            }
        }
    }
    return items.length > 0 ? items : [{ sku: text.slice(0, 50).replace(/\s+/g, " ").trim() || "未识别", quantity: 1 }];
}

export function SkuPhotoOcr({ onExtract, onClose }: SkuPhotoOcrProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;

        setLoading(true);
        setError(null);
        if (inputRef.current) inputRef.current.value = "";

        try {
            const { createWorker } = await import("tesseract.js");
            const worker = await createWorker("eng+chi_sim", 1, {
                logger: () => {},
            });
            const { data } = await worker.recognize(file);
            await worker.terminate();

            const items = parseOcrText(data.text);
            onExtract(items);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "OCR 识别失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-300">拍照识别 SKU</span>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <p className="text-xs text-slate-500">支持拍摄箱标、入库单，自动识别 SKU 与数量</p>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFile}
            />
            <button
                onClick={() => inputRef.current?.click()}
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-300 font-medium disabled:opacity-50 transition-colors"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        识别中...
                    </>
                ) : (
                    <>
                        <Camera className="w-4 h-4" />
                        拍照箱标 / 入库单
                    </>
                )}
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}
