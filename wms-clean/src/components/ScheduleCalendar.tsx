"use client";

// 2026-02-27 周历排班视图 - 按任务类型配色，支持拖拽调整时间
import { useMemo, useState } from "react";
import { DndContext, type DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, pointerWithin } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { getTaskTypeColor, getTaskTypeLabel } from "@/lib/scheduleConfig";

const HOUR_HEIGHT = 52;
const HEADER_HEIGHT = 44;

interface Personnel {
    id: string;
    name: string;
    code?: string | null;
}

export interface ScheduleTask {
    id: string;
    title: string;
    taskType: string;
    personnelIds: string[] | { id: string; name: string }[];
    startAt: string;
    endAt: string;
    status?: string;
}

interface ScheduleCalendarProps {
    tasks: ScheduleTask[];
    personnel: Personnel[];
    weekStart: Date;
    onTaskClick?: (task: ScheduleTask) => void;
    onTaskMove?: (taskId: string, newStartAt: string, newEndAt: string) => void;
}

function formatDayHeader(d: Date) {
    const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${days[d.getDay()]} ${d.getDate()}`;
}

function parseTime(d: string | Date): Date {
    return typeof d === "string" ? new Date(d) : d;
}

function toDateKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScheduleCalendar({ tasks, personnel, weekStart, onTaskClick, onTaskMove }: ScheduleCalendarProps) {
    const weekDays = useMemo(() => {
        const arr: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            arr.push(d);
        }
        return arr;
    }, [weekStart]);

    const dayStartHour = 12;  // 12:00 开始，主要为加班排班
    const dayEndHour = 22;    // 22:00 结束
    const totalHours = dayEndHour - dayStartHour;
    const totalHeight = totalHours * HOUR_HEIGHT;

    const getPersonnelNames = (ids: string[] | { id: string; name: string }[]) => {
        if (!Array.isArray(ids) || ids.length === 0) return "";
        const list = ids.map((p) => (typeof p === "string" ? personnel.find((x) => x.id === p)?.name : (p as { name: string }).name)).filter(Boolean);
        return list.join(", ");
    };

    const tasksByDay = useMemo(() => {
        const map: Record<string, ScheduleTask[]> = {};
        weekDays.forEach((d) => {
            map[toDateKey(d)] = tasks.filter((t) => {
                const start = parseTime(t.startAt);
                const startKey = toDateKey(start);
                return startKey === toDateKey(d);
            });
        });
        return map;
    }, [tasks, weekDays]);

    const getTopOffset = (d: Date) => {
        const h = d.getHours() + d.getMinutes() / 60;
        return ((h - dayStartHour) / totalHours) * totalHeight;
    };

    const getHeight = (start: Date, end: Date) => {
        const minutes = (end.getTime() - start.getTime()) / 60000;
        const hourFrac = minutes / 60;
        return (hourFrac / totalHours) * totalHeight;
    };

    const [isDraggingAny, setIsDraggingAny] = useState(false);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
    );

    const handleDragStart = () => setIsDraggingAny(true);
    const handleDragEnd = (event: DragEndEvent) => {
        setIsDraggingAny(false);
        const { active, over } = event;
        if (!over || !onTaskMove) return;
        const slotMatch = String(over.id).match(/^slot-(\d+)-(\d+)$/);
        const dayStr = slotMatch?.[1];
        const hourStr = slotMatch?.[2];
        if (!dayStr || !hourStr) return;
        const task = tasks.find((t) => t.id === active.id);
        if (!task) return;
        const dayIdx = parseInt(dayStr, 10);
        const hourIdx = parseInt(hourStr, 10);
        const targetDay = weekDays[dayIdx];
        if (!targetDay) return;
        const newStart = new Date(targetDay);
        newStart.setHours(dayStartHour + hourIdx, 0, 0, 0);
        const duration = parseTime(task.endAt).getTime() - parseTime(task.startAt).getTime();
        const newEnd = new Date(newStart.getTime() + duration);
        onTaskMove(task.id, newStart.toISOString(), newEnd.toISOString());
    };

    return (
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 overflow-hidden">
            {/* Day headers */}
            <div className="grid bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700" style={{ gridTemplateColumns: `56px repeat(7, minmax(0, 1fr))`, height: HEADER_HEIGHT }}>
                <div className="flex items-center justify-center text-xs text-zinc-500 p-1" />
                {weekDays.map((d) => (
                    <div key={d.toISOString()} className="flex items-center justify-center border-l border-zinc-200 dark:border-zinc-700">
                        <span className="font-semibold text-sm text-zinc-700 dark:text-zinc-200">{formatDayHeader(d)}</span>
                    </div>
                ))}
            </div>

            <div className="flex overflow-x-auto">
                {/* Time column */}
                <div className="shrink-0 w-14 flex flex-col">
                    {Array.from({ length: totalHours }).map((_, i) => (
                        <div key={i} className="border-b border-zinc-100 dark:border-zinc-700/50 text-xs text-zinc-500 px-1 py-0.5" style={{ height: HOUR_HEIGHT }}>
                            {dayStartHour + i}:00
                        </div>
                    ))}
                </div>

                {/* Day columns with task blocks */}
                {weekDays.map((day, dayIdx) => {
                    const dayKey = toDateKey(day);
                    const dayTasks = tasksByDay[dayKey] ?? [];
                    return (
                        <div
                            key={dayKey}
                            className="flex-1 min-w-[90px] border-l border-zinc-200 dark:border-zinc-700 relative"
                            style={{ height: totalHeight }}
                        >
                            {/* Hour slots as drop zones */}
                            {Array.from({ length: totalHours }).map((_, hourIdx) => (
                                <DroppableSlot key={hourIdx} dayIdx={dayIdx} hourIdx={hourIdx} elevated={isDraggingAny} />
                            ))}

                            {/* Hour grid lines */}
                            {Array.from({ length: totalHours - 1 }).map((_, i) => (
                                <div key={i} className="absolute left-0 right-0 border-b border-zinc-100 dark:border-zinc-700/30 pointer-events-none" style={{ top: (i + 1) * HOUR_HEIGHT }} />
                            ))}

                            {/* Task blocks */}
                            {dayTasks.map((task) => (
                                <DraggableTaskBlock
                                    key={task.id}
                                    task={task}
                                    personnel={personnel}
                                    getTopOffset={getTopOffset}
                                    getHeight={getHeight}
                                    getPersonnelNames={getPersonnelNames}
                                    onTaskClick={onTaskClick}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
        </DndContext>
    );
}

function DroppableSlot({ dayIdx, hourIdx, elevated }: { dayIdx: number; hourIdx: number; elevated?: boolean }) {
    const { setNodeRef, isOver } = useDroppable({ id: `slot-${dayIdx}-${hourIdx}`, data: { dayIdx, hourIdx } });
    return (
        <div
            ref={setNodeRef}
            className={`absolute left-0 right-0 ${isOver ? "bg-[#D94828]/20" : ""} ${elevated ? "z-10" : ""}`}
            style={{ top: hourIdx * HOUR_HEIGHT, height: HOUR_HEIGHT }}
        />
    );
}

function DraggableTaskBlock({
    task,
    personnel,
    getTopOffset,
    getHeight,
    getPersonnelNames,
    onTaskClick,
}: {
    task: ScheduleTask;
    personnel: Personnel[];
    getTopOffset: (d: Date) => number;
    getHeight: (s: Date, e: Date) => number;
    getPersonnelNames: (ids: string[] | { id: string; name: string }[]) => string;
    onTaskClick?: (t: ScheduleTask) => void;
}) {
    const start = parseTime(task.startAt);
    const end = parseTime(task.endAt);
    const top = getTopOffset(start);
    const height = Math.max(getHeight(start, end), 28);
    const color = getTaskTypeColor(task.taskType);
    const typeLabel = getTaskTypeLabel(task.taskType);
    const names = getPersonnelNames(task.personnelIds);
    const timeStr = `${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")} - ${end.getHours()}:${String(end.getMinutes()).padStart(2, "0")}`;

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task },
    });

    const style: React.CSSProperties = {
        top: `${top + 4}px`,
        height: `${height - 6}px`,
        backgroundColor: color,
        color: "#1e293b",
        ...(transform && { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }),
        ...(isDragging && { zIndex: 50 }),
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={() => onTaskClick?.(task)}
            className={`absolute left-1 right-1 rounded-lg border border-black/10 cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-[#D94828] transition-all duration-200 overflow-hidden shadow-sm ${isDragging ? "opacity-90 shadow-lg pointer-events-none" : ""}`}
            style={style}
        >
            <div className="p-1.5 h-full flex flex-col text-[11px] leading-tight pointer-events-none">
                <span className="font-bold truncate">{task.title}</span>
                <span className="opacity-90">{typeLabel}</span>
                <span className="opacity-80">{timeStr}</span>
                {names && <span className="opacity-90 truncate mt-auto">{names}</span>}
            </div>
        </div>
    );
}
