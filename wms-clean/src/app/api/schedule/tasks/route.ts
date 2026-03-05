// 2026-02-27 排班任务 API
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const sql = neon(DB_URL!);

function parseDateRange(searchParams: URLSearchParams) {
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (start && end) return { start, end };
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { start: weekStart.toISOString(), end: weekEnd.toISOString() };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const { start, end } = parseDateRange(searchParams);
        const rows = await sql`
            SELECT * FROM "ScheduleTask"
            WHERE "startAt" <= ${end}::timestamptz AND "endAt" >= ${start}::timestamptz
            AND "status" != 'cancelled'
            ORDER BY "startAt" ASC
        `;
        return NextResponse.json(rows);
    } catch (error) {
        console.error("Fetch tasks error:", error);
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as {
            title: string;
            taskType: string;
            personnelIds: string[];
            startAt: string;
            endAt: string;
        };
        const { title, taskType, personnelIds, startAt, endAt } = body;
        if (!title?.trim() || !taskType || !startAt || !endAt) {
            return NextResponse.json({ error: "title, taskType, startAt, endAt required" }, { status: 400 });
        }
        const ids = Array.isArray(personnelIds) ? personnelIds : [];
        const idsJson = JSON.stringify(ids);
        const id = crypto.randomUUID();
        await sql`
            INSERT INTO "ScheduleTask" ("id", "title", "taskType", "personnelIds", "startAt", "endAt", "status", "createdAt", "updatedAt")
            VALUES (${id}, ${title.trim()}, ${taskType}, ${idsJson}::jsonb, ${startAt}::timestamptz, ${endAt}::timestamptz, 'scheduled', NOW(), NOW())
        `;
        const [row] = await sql`SELECT * FROM "ScheduleTask" WHERE "id" = ${id}`;
        return NextResponse.json(row);
    } catch (error) {
        console.error("Create task error:", error);
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
}
