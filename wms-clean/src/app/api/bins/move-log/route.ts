// Updated 2026-02-27T05:18:00Z - 库位变化记录 API
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";
const sql = neon(DB_URL);

export async function POST(request: Request) {
    try {
        const { sourceIds, targetId } = (await request.json()) as { sourceIds: string[]; targetId: string };
        if (!Array.isArray(sourceIds) || !targetId) {
            return NextResponse.json({ error: "sourceIds and targetId required" }, { status: 400 });
        }

        const sourceIdsJson = JSON.stringify(sourceIds);
        const id = crypto.randomUUID();
        await sql`
            INSERT INTO "BinMoveLog" ("id", "sourceIds", "targetId", "movedAt")
            VALUES (${id}, ${sourceIdsJson}::jsonb, ${targetId}, NOW())
        `;
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("BinMoveLog error:", error);
        return NextResponse.json({ error: "Failed to log bin move" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const rows = await sql`
            SELECT * FROM "BinMoveLog" ORDER BY "movedAt" DESC LIMIT 100
        `;
        return NextResponse.json(rows);
    } catch (error) {
        console.error("Fetch BinMoveLog error:", error);
        return NextResponse.json({ error: "Failed to fetch move logs" }, { status: 500 });
    }
}
