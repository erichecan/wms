// 2026-02-27T09:40:00Z - 全局 SKU 模糊搜索
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, Package } from "lucide-react";
import { useWarehouseStore } from "@/store/warehouseStore";
import { useRouter } from "next/navigation";

export function SkuSearch() {
    const router = useRouter();
    const bins = useWarehouseStore(s => s.bins);
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setExpanded(false);
        };
        document.addEventListener("click", fn);
        return () => document.removeEventListener("click", fn);
    }, []);

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q || q.length < 2) return [];
        const results: { binId: string; col: string; sku: string; quantity: number }[] = [];
        bins.forEach(bin => {
            const items = Array.isArray(bin.items) && bin.items.length > 0
                ? bin.items
                : bin.sku ? [{ sku: bin.sku, quantity: bin.quantity }] : [];
            for (const it of items) {
                if (it.sku && it.sku.toLowerCase().includes(q)) {
                    results.push({ binId: bin.id, col: bin.col, sku: it.sku, quantity: it.quantity });
                }
            }
        });
        return results.slice(0, 20);
    }, [bins, query]);

    const handleSelect = (col: string) => {
        setQuery("");
        setExpanded(false);
        router.push(`/aisle/${encodeURIComponent(col)}`);
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-800/80 rounded-lg border border-white/10 px-3 py-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setExpanded(true); }}
                    onFocus={() => setExpanded(true)}
                    placeholder="搜索 SKU..."
                    className="bg-transparent flex-1 min-w-[120px] text-sm focus:outline-none placeholder:text-slate-500"
                />
                {query && (
                    <button onClick={() => { setQuery(""); setExpanded(false); }} className="p-1 hover:bg-white/10 rounded">
                        <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                )}
            </div>
            {expanded && (query.length >= 2) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-[280px] overflow-y-auto z-50">
                    {matches.length === 0 ? (
                        <div className="p-4 text-slate-500 text-sm text-center">未找到匹配的 SKU</div>
                    ) : (
                        <ul className="py-1">
                            {matches.map((m, i) => (
                                <li key={`${m.binId}-${m.sku}-${i}`}>
                                    <button
                                        onClick={() => handleSelect(m.col)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/80 text-left transition-colors"
                                    >
                                        <Package className="w-4 h-4 text-indigo-400 shrink-0" />
                                        <span className="font-mono font-semibold text-white truncate flex-1">{m.sku}</span>
                                        <span className="text-indigo-400 font-bold shrink-0">{m.quantity}</span>
                                        <span className="text-slate-500 text-xs shrink-0">{m.binId}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            {expanded && !query && (
                <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-slate-900/95 border border-slate-700 rounded-lg text-slate-500 text-xs z-50">
                    输入 2 个字符以上搜索 SKU
                </div>
            )}
        </div>
    );
}
