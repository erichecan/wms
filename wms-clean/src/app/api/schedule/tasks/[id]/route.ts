// 2026-02-27 单个任务 PATCH/DELETE
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const sql = neon(DB_URL!);

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await ctx.params;
        const [existing] = await sql`SELECT * FROM "ScheduleTask" WHERE "id" = ${id}`;
        if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
        const body = (await request.json()) as Partial<{
            title: string;
            taskType: string;
            personnelIds: string[];
            startAt: string;
            endAt: string;
            status: string;
        }>;
        const title = body.title !== undefined ? body.title.trim() : existing.title;
        const taskType = body.taskType ?? existing.taskType;
        const personnelIds = body.personnelIds !== undefined ? JSON.stringify(body.personnelIds) : JSON.stringify(existing.personnelIds ?? []);
        const startAt = body.startAt ?? (existing.startAt instanceof Date ? existing.startAt.toISOString() : existing.startAt);
        const endAt = body.endAt ?? (existing.endAt instanceof Date ? existing.endAt.toISOString() : existing.endAt);
        const status = body.status ?? existing.status;
        await sql`
            UPDATE "ScheduleTask" SET "title" = ${title}, "taskType" = ${taskType}, "personnelIds" = ${personnelIds}::jsonb,
            "startAt" = ${startAt}::timestamptz, "endAt" = ${endAt}::timestamptz, "status" = ${status}, "updatedAt" = NOW()
            WHERE "id" = ${id}
        `;
        const [row] = await sql`SELECT * FROM "ScheduleTask" WHERE "id" = ${id}`;
        return NextResponse.json(row);
    } catch (error) {
        console.error("Update task error:", error);
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await ctx.params;
        await sql`DELETE FROM "ScheduleTask" WHERE "id" = ${id}`;
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Delete task error:", error);
        return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }
}
