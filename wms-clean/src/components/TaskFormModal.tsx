"use client";

// 2026-02-27 任务表单弹窗 - 仓库经理录入/编辑任务
import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { TASK_TYPES } from "@/lib/scheduleConfig";

interface Personnel {
    id: string;
    name: string;
    code?: string | null;
}

interface ScheduleTask {
    id: string;
    title: string;
    taskType: string;
    personnelIds: string[] | { id: string }[];
    startAt: string;
    endAt: string;
}

interface TaskFormModalProps {
    personnel: Personnel[];
    weekStart?: Date;
    task?: ScheduleTask | null;
    onClose: () => void;
    onSaved: () => void;
    onDeleted?: () => void;
}

function toLocalDateTime(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${min}`;
}

export function TaskFormModal({ personnel, weekStart, task, onClose, onSaved, onDeleted }: TaskFormModalProps) {
    const [title, setTitle] = useState("");
    const [taskType, setTaskType] = useState("picking");
    const [personnelIds, setPersonnelIds] = useState<string[]>([]);
    const [startAt, setStartAt] = useState("");
    const [endAt, setEndAt] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setTaskType(task.taskType);
            setPersonnelIds(Array.isArray(task.personnelIds) ? task.personnelIds.map((p) => (typeof p === "string" ? p : p.id)) : []);
            setStartAt(toLocalDateTime(new Date(task.startAt)));
            setEndAt(toLocalDateTime(new Date(task.endAt)));
        } else if (weekStart) {
            const d = new Date(weekStart);
            d.setHours(9, 0, 0, 0);
            setStartAt(toLocalDateTime(d));
            d.setHours(10, 0, 0, 0);
            setEndAt(toLocalDateTime(d));
        }
    }, [task, weekStart]);

    const togglePersonnel = (id: string) => {
        setPersonnelIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSaving(true);
        try {
            const start = new Date(startAt);
            const end = new Date(endAt);
            if (end <= start) {
                setError("结束时间必须晚于开始时间");
                setSaving(false);
                return;
            }
            // 人员冲突检测 - 2026-02-27
            if (personnelIds.length > 0) {
                const res = await fetch("/api/schedule/tasks/check-conflicts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        personnelIds,
                        startAt: start.toISOString(),
                        endAt: end.toISOString(),
                        excludeTaskId: task?.id,
                    }),
                });
                const { conflicts } = (await res.json()) as { conflicts?: { taskId: string; title: string; personId: string }[] };
                if (Array.isArray(conflicts) && conflicts.length > 0) {
                    const names = conflicts.map((c) => personnel.find((p) => p.id === c.personId)?.name || c.personId).join("、");
                    if (!confirm(`以下人员在该时间段已有其他任务：${names}，确定仍要保存？`)) {
                        setSaving(false);
                        return;
                    }
                }
            }
            if (task) {
                const res = await fetch(`/api/schedule/tasks/${task.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, taskType, personnelIds, startAt: start.toISOString(), endAt: end.toISOString() }),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "更新失败");
                }
            } else {
                const res = await fetch("/api/schedule/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, taskType, personnelIds, startAt: start.toISOString(), endAt: end.toISOString() }),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "创建失败");
                }
            }
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : "操作失败");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!task || !onDeleted) return;
        if (!confirm("确定删除此任务？")) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/schedule/tasks/${task.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("删除失败");
            onDeleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : "删除失败");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-700" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
                    <h2 className="text-lg font-bold">{task ? "编辑任务" : "新增任务"}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 rounded-lg bg-red-500/20 text-red-600 text-sm">{error}</div>}

                    <div>
                        <label className="block text-sm font-medium mb-1">任务标题</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-[#D94828]"
                            placeholder="如：订单拣货、A区盘点"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">任务类型</label>
                        <select
                            value={taskType}
                            onChange={(e) => setTaskType(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-[#D94828]"
                        >
                            {TASK_TYPES.map((t) => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">执行人员</label>
                        <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/50 min-h-[44px]">
                            {personnel.length === 0 ? (
                                <span className="text-zinc-500 text-sm">请先在人员管理中添加人员</span>
                            ) : (
                                personnel.map((p) => (
                                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={personnelIds.includes(p.id)}
                                            onChange={() => togglePersonnel(p.id)}
                                            className="rounded border-zinc-300"
                                        />
                                        <span className="text-sm">{p.name}{p.code ? ` (${p.code})` : ""}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">开始时间</label>
                            <input
                                type="datetime-local"
                                value={startAt}
                                onChange={(e) => setStartAt(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-[#D94828]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">结束时间</label>
                            <input
                                type="datetime-local"
                                value={endAt}
                                onChange={(e) => setEndAt(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-[#D94828]"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        {task && onDeleted && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                删除
                            </button>
                        )}
                        <div className="flex-1" />
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors duration-200">
                            取消
                        </button>
                        <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg bg-[#D94828] text-white hover:bg-[#b83d22] disabled:opacity-50 transition-colors duration-200 cursor-pointer">
                            {saving ? "保存中..." : "保存"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
