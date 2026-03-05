"use client";

// 2026-02-27 仓库人员排班 - 主页面
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Users, Calendar } from "lucide-react";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { TaskFormModal } from "@/components/TaskFormModal";
import { TASK_TYPES } from "@/lib/scheduleConfig";

interface Personnel {
    id: string;
    name: string;
    code?: string | null;
    createdAt?: string;
}

interface ScheduleTask {
    id: string;
    title: string;
    taskType: string;
    personnelIds: string[] | { id: string; name: string }[];
    startAt: string;
    endAt: string;
    status?: string;
}

function getWeekStart(d: Date): Date {
    const d2 = new Date(d);
    const day = d2.getDay();
    const diff = d2.getDate() - day + (day === 0 ? -6 : 1);
    d2.setDate(diff);
    d2.setHours(0, 0, 0, 0);
    return d2;
}

export default function SchedulePage() {
    const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
    const [tasks, setTasks] = useState<ScheduleTask[]>([]);
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);

    const fetchTasks = useCallback(async () => {
        const start = new Date(weekStart);
        const end = new Date(weekStart);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        const res = await fetch(`/api/schedule/tasks?start=${start.toISOString()}&end=${end.toISOString()}`);
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
    }, [weekStart]);

    const fetchPersonnel = useCallback(async () => {
        const res = await fetch("/api/schedule/personnel");
        const data = await res.json();
        setPersonnel(Array.isArray(data) ? data : []);
    }, []);

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchTasks(), fetchPersonnel()]).finally(() => setLoading(false));
    }, [fetchTasks, fetchPersonnel]);

    const handleTaskCreated = () => {
        setShowForm(false);
        fetchTasks();
    };

    const handleTaskClick = (task: ScheduleTask) => {
        setEditingTask(task);
    };

    const handleTaskUpdated = () => {
        setEditingTask(null);
        fetchTasks();
    };

    const handleTaskDeleted = () => {
        setEditingTask(null);
        fetchTasks();
    };

    const handleTaskMove = async (taskId: string, newStartAt: string, newEndAt: string) => {
        try {
            const res = await fetch(`/api/schedule/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ startAt: newStartAt, endAt: newEndAt }),
            });
            if (!res.ok) throw new Error("更新失败");
            fetchTasks();
        } catch {
            // Silently fail or could toast
        }
    };

    const prevWeek = () => {
        setWeekStart((d) => {
            const n = new Date(d);
            n.setDate(n.getDate() - 7);
            return n;
        });
    };

    const nextWeek = () => {
        setWeekStart((d) => {
            const n = new Date(d);
            n.setDate(n.getDate() + 7);
            return n;
        });
    };

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekRange = `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

    return (
        <div className="min-h-screen flex flex-col">
            <div className="p-4 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-[#D94828] transition-colors cursor-pointer">
                            <ArrowLeft className="w-5 h-5" />
                            返回
                        </Link>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-[#D94828]" />
                            仓库人员排班
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={prevWeek}
                            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-200 cursor-pointer"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-4 font-medium text-zinc-700 dark:text-zinc-200 min-w-[180px] text-center">{weekRange}</span>
                        <button
                            onClick={nextWeek}
                            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-200 cursor-pointer"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={() => { setEditingTask(null); setShowForm(true); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D94828] text-white hover:bg-[#b83d22] transition-colors duration-200 font-medium cursor-pointer"
                    >
                        <Plus className="w-5 h-5" />
                        新增任务
                    </button>
                    <Link
                        href="/schedule/personnel"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-200 cursor-pointer"
                    >
                        <Users className="w-5 h-5" />
                        人员管理 ({personnel.length})
                    </Link>
                </div>

                {/* 任务类型图例 */}
                <div className="flex flex-wrap gap-3 text-sm">
                    {TASK_TYPES.map((t) => (
                        <span key={t.id} className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded border border-black/10" style={{ backgroundColor: t.color }} />
                            {t.label}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex-1 px-4 pb-8 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-zinc-500">加载中...</div>
                ) : (
                    <ScheduleCalendar
                        tasks={tasks}
                        personnel={personnel}
                        weekStart={weekStart}
                        onTaskClick={handleTaskClick}
                        onTaskMove={handleTaskMove}
                    />
                )}
            </div>

            {showForm && (
                <TaskFormModal
                    personnel={personnel}
                    weekStart={weekStart}
                    onClose={() => setShowForm(false)}
                    onSaved={handleTaskCreated}
                />
            )}

            {editingTask && (
                <TaskFormModal
                    personnel={personnel}
                    task={editingTask}
                    onClose={() => setEditingTask(null)}
                    onSaved={handleTaskUpdated}
                    onDeleted={handleTaskDeleted}
                />
            )}
        </div>
    );
}
