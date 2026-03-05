// 2026-02-27 Apony 配色：主色红橙系 + 中性灰
export const TASK_TYPES = [
    { id: "picking", label: "拣货", color: "#fef2f0" },      // Apony red tint
    { id: "packing", label: "包装", color: "#e8f5e9" },      // soft green
    { id: "receiving", label: "收货", color: "#fce4ec" },    // soft pink
    { id: "inventory", label: "盘点", color: "#e3f2fd" },   // soft blue
    { id: "sorting", label: "分货", color: "#f3e5f5" },      // soft purple
    { id: "organize", label: "整理库位", color: "#fff3e0" }, // soft amber
] as const;

export type TaskTypeId = (typeof TASK_TYPES)[number]["id"];

export function getTaskTypeColor(taskType: string): string {
    const t = TASK_TYPES.find((x) => x.id === taskType || x.label === taskType);
    return t?.color ?? "#e5e7eb";
}

export function getTaskTypeLabel(taskType: string): string {
    const t = TASK_TYPES.find((x) => x.id === taskType || x.label === taskType);
    return t?.label ?? taskType;
}
