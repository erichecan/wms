// Updated 2026-02-27T05:10:00Z - 通道二维码扫描，扫码后跳转至对应通道 2D 图
"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

interface AisleQrScannerProps {
    onClose: () => void;
    onScan: (aisleId: string) => void;
}

/** 从扫码结果解析通道 ID：支持 K1、K1-2-A、wms:aisle:K1、/aisle/K1 等格式 */
function parseAisleId(decodedText: string): string | null {
    const t = decodedText.trim();
    if (!t) return null;
    // URL 格式: https://xxx/aisle/K1 或 /aisle/K1
    const urlMatch = t.match(/\/(?:aisle|channel)\/([A-Za-z0-9]+)/i);
    if (urlMatch?.[1]) return urlMatch[1];
    // 协议格式: wms:aisle:K1
    if (t.startsWith("wms:aisle:")) return t.slice(10);
    // Bin 格式: K1-2-A -> 取 col 部分
    const binMatch = t.match(/^([A-Za-z0-9]+)(?:-\d+-[A-Z])?/);
    if (binMatch?.[1]) return binMatch[1];
    // 纯通道 ID: K1, A1
    if (/^[A-Za-z0-9]+$/.test(t)) return t;
    return null;
}

export function AisleQrScanner({ onClose, onScan }: AisleQrScannerProps) {
    const [error, setError] = useState<string | null>(null);
    const html5QrRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {

        const elementId = "qr-reader";
        const startScan = async () => {
            try {
                const html5Qr = new Html5Qrcode(elementId);
                html5QrRef.current = html5Qr;

                await html5Qr.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        const aisleId = parseAisleId(decodedText);
                        if (aisleId) {
                            html5Qr.stop().catch(() => {});
                            onScan(aisleId);
                        }
                    },
                    () => {}
                );
                setError(null);
            } catch (err) {
                const msg = err instanceof Error ? err.message : "无法启动相机";
                setError(msg.includes("Permission") ? "请允许 camera 权限" : msg);
            }
        };

        startScan();
        return () => {
            html5QrRef.current?.stop().catch(() => {}).finally(() => {
                html5QrRef.current = null;
            });
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">扫描通道二维码</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div
                    id="qr-reader"
                    className="rounded-xl overflow-hidden bg-slate-900"
                />
                {error && (
                    <p className="text-sm text-red-400">{error}</p>
                )}
                <p className="text-xs text-slate-500 text-center">
                    支持通道码（如 K1）、Bin 码（如 K1-2-A）或带 /aisle/ 的链接
                </p>
            </div>
        </div>
    );
}
