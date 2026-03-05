// Updated 2026-02-26T08:40:00Z - 拍照箱标/入库单，OCR 识别 SKU；无黑名单，避免误伤真实 SKU（如 Part-001、QTY-100）
"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, X } from "lucide-react";
import type { BinItem } from "@/store/warehouseStore";

interface SkuPhotoOcrProps {
    onExtract: (items: BinItem[]) => void;
    onClose: () => void;
}

/** 判断是否为有效 SKU 候选：长度 5-25、含字母、非纯数字。不做黑名单，避免误伤如 Part-001、SKU-123 等真实 SKU */
function isValidSkuCandidate(s: string): boolean {
    const n = s.length;
    if (n < 5 || n > 25) return false;
    if (/^\d+$/.test(s)) return false;
    if (!/[A-Za-z]/.test(s)) return false; // 至少含一个字母
    return true;
}

/** 从 OCR 文本提取 SKU 与数量：支持箱标、入库单常见格式 */
function parseOcrText(text: string): BinItem[] {
    const items: BinItem[] = [];
    const seen = new Set<string>();
    const lines = text.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
    // 正则要求 5-25 位（首字字母数字，后续可含 - _ .），避免单字符/短串被当成 SKU
    const skuPattern = /[A-Za-z0-9][A-Za-z0-9\-_\.]{4,24}/g;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const skuCandidates = line.match(skuPattern) || [];
        const nums = line.match(/\d+/g);
        const lastNum = nums?.[nums.length - 1];
        const qty = lastNum != null ? parseInt(lastNum, 10) : 1;

        for (const sku of skuCandidates) {
            const normalized = sku.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
            if (isValidSkuCandidate(normalized) && !seen.has(normalized)) {
                seen.add(normalized);
                items.push({ sku: normalized, quantity: Math.min(qty, 9999) || 1 });
            }
        }
        if (skuCandidates.length === 0 && nums && line.length >= 4 && line.length < 30) {
            const nextLine = lines[i + 1];
            if (nextLine) {
                const nextSkus = nextLine.match(skuPattern) || [];
                for (const sku of nextSkus) {
                    const normalized = sku.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
                    if (isValidSkuCandidate(normalized) && !seen.has(normalized)) {
                        seen.add(normalized);
                        items.push({ sku: normalized, quantity: Math.min(qty, 9999) || 1 });
                    }
                }
            }
        }
    }
    // 若识别到疑似碎片化（大量短项），只保留最长的 1–3 个或退回兜底
    if (items.length > 15) {
        const sorted = [...items].sort((a, b) => b.sku.length - a.sku.length);
        const kept = sorted.slice(0, 5).filter((x) => x.sku.length >= 6);
        if (kept.length > 0) {
            return kept;
        }
    }
    const fallbackSku = text.replace(/\s+/g, " ").trim().slice(0, 50) || "未识别";
    return items.length > 0 ? items : [{ sku: fallbackSku, quantity: 1 }];
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
            const Tesseract = await import("tesseract.js");
            const worker = await Tesseract.createWorker("eng+chi_sim", 1, {
                logger: () => {},
            });
            // PSM 6 = 单块模式，将整张图作为一块文字，减少箱标碎片化（每个字母/字符被单独识别）
            const psm = Tesseract.PSM?.SINGLE_BLOCK ?? "6";
            await worker.setParameters({ tessedit_pageseg_mode: psm });
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
        <div className="p-4 rounded-xl bg-zinc-800/80 border border-zinc-700 space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-zinc-300">拍照识别 SKU</span>
                <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <p className="text-xs text-zinc-500">支持拍摄箱标、入库单，自动识别 SKU 与数量</p>
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
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#D94828]/30 hover:bg-[#D94828]/50 text-white font-medium disabled:opacity-50 transition-colors cursor-pointer"
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
