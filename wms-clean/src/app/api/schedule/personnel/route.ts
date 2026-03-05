// 2026-02-27 仓库人员 API
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const sql = neon(DB_URL!);

export async function GET() {
    try {
        const rows = await sql`SELECT * FROM "Personnel" ORDER BY "createdAt" ASC`;
        return NextResponse.json(rows);
    } catch (error) {
        console.error("Fetch personnel error:", error);
        return NextResponse.json({ error: "Failed to fetch personnel" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as { name: string; code?: string };
        const { name, code } = body;
        if (!name?.trim()) {
            return NextResponse.json({ error: "name required" }, { status: 400 });
        }
        const id = crypto.randomUUID();
        await sql`
            INSERT INTO "Personnel" ("id", "name", "code", "createdAt")
            VALUES (${id}, ${name.trim()}, ${code?.trim() || null}, NOW())
        `;
        const [row] = await sql`SELECT * FROM "Personnel" WHERE "id" = ${id}`;
        return NextResponse.json(row);
    } catch (error) {
        console.error("Create personnel error:", error);
        return NextResponse.json({ error: "Failed to create personnel" }, { status: 500 });
    }
}
