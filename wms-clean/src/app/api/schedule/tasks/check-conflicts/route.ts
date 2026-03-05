// 2026-02-27 人员冲突检测：检查指定人员在时间范围内是否有重叠任务
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const sql = neon(DB_URL!);

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as { personnelIds: string[]; startAt: string; endAt: string; excludeTaskId?: string };
        const { personnelIds, startAt, endAt, excludeTaskId } = body;
        if (!Array.isArray(personnelIds) || personnelIds.length === 0 || !startAt || !endAt) {
            return NextResponse.json({ error: "personnelIds, startAt, endAt required" }, { status: 400 });
        }
        const rows = await sql`
            SELECT id, title, "taskType", "personnelIds", "startAt", "endAt"
            FROM "ScheduleTask"
            WHERE "status" != 'cancelled'
            AND "startAt" < ${endAt}::timestamptz AND "endAt" > ${startAt}::timestamptz
        `;
        const overlapping: { taskId: string; title: string; personId: string }[] = [];
        for (const task of rows) {
            if (excludeTaskId && task.id === excludeTaskId) continue;
            const ids = (task.personnelIds as string[]) || [];
            for (const pid of personnelIds) {
                if (ids.includes(pid)) {
                    overlapping.push({ taskId: task.id, title: task.title, personId: pid });
                }
            }
        }
        return NextResponse.json({ conflicts: overlapping });
    } catch (error) {
        console.error("Check conflicts error:", error);
        return NextResponse.json({ error: "Failed to check conflicts" }, { status: 500 });
    }
}
