// Updated 2026-02-26T08:50:00Z - 深色卡片背景，提升可读性
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode, Calendar, Printer, Smartphone, Package, Zap, LayoutGrid } from "lucide-react";
import { AisleQrScanner } from "./AisleQrScanner";

export function HomePageClient() {
    const router = useRouter();
    const [showScanner, setShowScanner] = useState(false);

    const handleScan = (aisleId: string) => {
        setShowScanner(false);
        router.push(`/aisle/${encodeURIComponent(aisleId)}`);
    };

    const cardBase = "p-6 rounded-xl border border-zinc-600 hover:border-[#D94828]/60 transition-colors duration-200 font-semibold flex flex-col items-center justify-center gap-2 cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white";

    return (
        <div className="p-8 flex items-center justify-center flex-1 bg-zinc-950">
            <div className="max-w-2xl w-full p-8 rounded-2xl shadow-xl flex flex-col gap-6 text-center border border-zinc-700 bg-zinc-900">
                <h2 className="text-3xl font-bold text-white">
                    Welcome to <span className="text-[#D94828]">w</span>MS Pro
                </h2>
                <p className="text-zinc-400 text-lg">请选择模块继续</p>

                <button
                    onClick={() => setShowScanner(true)}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-[#D94828]/60 bg-zinc-800 hover:bg-zinc-700 font-semibold text-[#D94828] hover:text-[#e85a3a] transition-colors duration-200"
                >
                    <QrCode className="w-6 h-6" />
                    扫描通道二维码
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <Link href="/schedule" className={cardBase}>
                        <Calendar className="w-8 h-8 text-[#D94828]" />
                        仓库人员排班
                    </Link>
                    <Link href="/aisle-qrcodes" className={cardBase}>
                        <Printer className="w-8 h-8 text-[#D94828]" />
                        通道二维码打印
                    </Link>
                    <Link href="/aisle/K1" className={cardBase}>
                        <Smartphone className="w-8 h-8 text-zinc-400" />
                        Default Aisle (K1)
                    </Link>
                    <Link href="/aisle/F33" className={cardBase}>
                        <Package className="w-8 h-8 text-zinc-400" />
                        Imported: Aisle F33
                    </Link>
                    <Link href="/aisle/A1" className={cardBase}>
                        <Zap className="w-8 h-8 text-zinc-400" />
                        Imported: Aisle A1
                    </Link>
                    <Link href="/admin/layout" className={cardBase}>
                        <LayoutGrid className="w-8 h-8 text-zinc-400" />
                        Layout Builder
                    </Link>
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-2 text-zinc-400 text-sm">
                    <span>其他通道：</span>
                    {["E11", "V4", "M1", "Y2", "T3"].map(aisle => (
                        <Link key={aisle} href={`/aisle/${aisle}`} className="hover:text-[#D94828] hover:underline transition-colors duration-200">
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
