// 2026-02-27 删除人员
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const sql = neon(DB_URL!);

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await ctx.params;
        await sql`DELETE FROM "Personnel" WHERE "id" = ${id}`;
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Delete personnel error:", error);
        return NextResponse.json({ error: "Failed to delete personnel" }, { status: 500 });
    }
}
