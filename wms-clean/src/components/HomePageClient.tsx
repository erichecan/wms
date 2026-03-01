// Updated 2026-02-27T05:10:00Z - 首页客户端：扫码入口
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import { AisleQrScanner } from "./AisleQrScanner";

export function HomePageClient() {
    const router = useRouter();
    const [showScanner, setShowScanner] = useState(false);

    const handleScan = (aisleId: string) => {
        setShowScanner(false);
        router.push(`/aisle/${encodeURIComponent(aisleId)}`);
    };

    return (
        <div className="p-8 flex items-center justify-center flex-1">
            <div className="glass max-w-2xl w-full p-8 rounded-2xl shadow-xl flex flex-col gap-6 text-center">
                <h2 className="text-3xl font-bold">Welcome to wMS Pro</h2>
                <p className="opacity-80 text-lg">
                    Please select a module to continue.
                </p>

                {/* 扫码入口 - 2026-02-27T05:10:00Z */}
                <button
                    onClick={() => setShowScanner(true)}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all font-semibold text-indigo-400 hover:text-indigo-300"
                >
                    <QrCode className="w-6 h-6" />
                    扫描通道二维码
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <Link href="/aisle/K1" className="p-6 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all font-semibold flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">📱</span>
                        Default Aisle (K1)
                    </Link>
                    <Link href="/aisle/F33" className="p-6 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all font-semibold flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">📦</span>
                        Imported: Aisle F33
                    </Link>
                    <Link href="/aisle/A1" className="p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all font-semibold flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">⚡</span>
                        Imported: Aisle A1
                    </Link>
                    <Link href="/admin/layout" className="p-6 rounded-xl border border-slate-500/30 bg-slate-500/10 hover:bg-slate-500/20 transition-all font-semibold flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">💻</span>
                        Layout Builder
                    </Link>
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-2 opacity-60 text-sm">
                    <span>Other Areas:</span>
                    {["E11", "V4", "M1", "Y2", "T3"].map(aisle => (
                        <Link key={aisle} href={`/aisle/${aisle}`} className="hover:underline hover:text-indigo-400">
                            {aisle}
                        </Link>
                    ))}
                </div>
            </div>

            {showScanner && (
                <AisleQrScanner onClose={() => setShowScanner(false)} onScan={handleScan} />
            )}
        </div>
    );
}
