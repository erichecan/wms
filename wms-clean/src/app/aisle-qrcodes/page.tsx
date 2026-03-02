"use client";

// 2026-02-27 通道二维码页面：获取并打印每个通道的二维码
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, QrCode, Printer } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useWarehouseStore } from "@/store/warehouseStore";

export default function AisleQrcodesPage() {
    const aisles = useWarehouseStore((s) => s.aisles);
    const bins = useWarehouseStore((s) => s.bins);
    const fetchBins = useWarehouseStore((s) => s.fetchBins);

    const [origin, setOrigin] = useState("");
    const [aisleIds, setAisleIds] = useState<string[]>([]);

    useEffect(() => {
        fetchBins();
    }, [fetchBins]);

    useEffect(() => {
        setOrigin(typeof window !== "undefined" ? window.location.origin : "");
    }, []);

    useEffect(() => {
        const fromLayout = aisles.map((a) => a.id);
        const fromBins = [...new Set(bins.map((b) => b.col).filter(Boolean))];
        const merged = [...new Set([...fromLayout, ...fromBins])].sort();
        setAisleIds(merged.length > 0 ? merged : ["K1", "K2", "K3", "K4"]);
    }, [aisles, bins]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen p-6 print:p-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6 print:hidden">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        返回首页
                    </Link>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                    >
                        <Printer className="w-5 h-5" />
                        打印二维码
                    </button>
                </div>

                <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <QrCode className="w-8 h-8 text-indigo-400" />
                    通道二维码
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                    扫码可跳转到对应通道页面。打印后张贴于各通道入口。
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 print:grid-cols-3 print:gap-4">
                    {aisleIds.map((aisleId) => {
                        const url = origin ? `${origin}/aisle/${encodeURIComponent(aisleId)}` : `/aisle/${aisleId}`;
                        return (
                            <div
                                key={aisleId}
                                className="flex flex-col items-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 print:border print:rounded-lg"
                            >
                                <div className="bg-white p-3 rounded-lg mb-3 print:p-2">
                                    <QRCodeCanvas value={url} size={120} level="M" />
                                </div>
                                <span className="font-mono font-bold text-lg">{aisleId}</span>
                                <span className="text-xs text-slate-500 mt-1 break-all text-center">{url}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
