"use client";

// 2026-02-27 库位变更记录面板：展示拖拽/SKU 移动记录
import { useState, useEffect } from "react";
import { History, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MoveLogEntry {
    id: string;
    sourceIds: string[];
    targetId: string;
    movedAt: string;
}

export function MoveLogPanel() {
    const [logs, setLogs] = useState<MoveLogEntry[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/bins/move-log");
            const data = await res.json();
            setLogs(Array.isArray(data) ? data : []);
        } catch {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) fetchLogs();
    }, [open]);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
                title="库位变更记录"
            >
                <History className="w-5 h-5" />
                <span className="hidden sm:inline">变更记录</span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="glass w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl shadow-xl flex flex-col"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <History className="w-5 h-5 text-indigo-400" />
                                    库位变更记录
                                </h3>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                {loading ? (
                                    <div className="text-center py-8 text-slate-400">加载中...</div>
                                ) : logs.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">暂无变更记录</div>
                                ) : (
                                    <ul className="space-y-3">
                                        {logs.map((entry) => (
                                            <li
                                                key={entry.id}
                                                className="bg-white/5 rounded-xl p-3 border border-white/10 text-sm"
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-mono text-amber-400">
                                                        {Array.isArray(entry.sourceIds) ? entry.sourceIds.join(", ") : String(entry.sourceIds)}
                                                    </span>
                                                    <span className="text-slate-400">→</span>
                                                    <span className="font-mono text-emerald-400">{entry.targetId}</span>
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    {new Date(entry.movedAt).toLocaleString("zh-CN")}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
