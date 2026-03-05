"use client";

// 2026-02-27 人员管理
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface Personnel {
    id: string;
    name: string;
    code?: string | null;
    createdAt?: string;
}

export default function PersonnelPage() {
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchPersonnel = async () => {
        const res = await fetch("/api/schedule/personnel");
        const data = await res.json();
        setPersonnel(Array.isArray(data) ? data : []);
    };

    useEffect(() => {
        setLoading(true);
        fetchPersonnel().finally(() => setLoading(false));
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setAdding(true);
        try {
            const res = await fetch("/api/schedule/personnel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), code: code.trim() || undefined }),
            });
            if (!res.ok) throw new Error("添加失败");
            setName("");
            setCode("");
            fetchPersonnel();
        } catch {
            alert("添加失败");
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("确定删除该人员？")) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/schedule/personnel/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("删除失败");
            fetchPersonnel();
        } catch {
            alert("删除失败");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <Link href="/schedule" className="flex items-center gap-2 text-zinc-500 hover:text-[#D94828] transition-colors cursor-pointer">
                        <ArrowLeft className="w-5 h-5" />
                        返回排班
                    </Link>
                    <h1 className="text-xl font-bold">人员管理</h1>
                </div>

                <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="姓名"
                        className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
                        required
                    />
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="工号（选填）"
                        className="w-28 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
                    />
                    <button type="submit" disabled={adding} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D94828] text-white hover:bg-[#b83d22] disabled:opacity-50 cursor-pointer transition-colors duration-200">
                        <Plus className="w-5 h-5" />
                        添加
                    </button>
                </form>

                {loading ? (
                    <div className="text-zinc-500">加载中...</div>
                ) : (
                    <ul className="space-y-2">
                        {personnel.map((p) => (
                            <li key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80">
                                <span className="font-medium">{p.name}</span>
                                <span className="flex items-center gap-2">
                                    {p.code && <span className="text-zinc-500 text-sm">{p.code}</span>}
                                    <button
                                        onClick={() => handleDelete(p.id)}
                                        disabled={deletingId === p.id}
                                        className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                        title="删除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </span>
                            </li>
                        ))}
                        {personnel.length === 0 && <div className="text-zinc-500 text-center py-8">暂无人员，请添加</div>}
                    </ul>
                )}
            </div>
        </div>
    );
}
