import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_NqtkoQb4fK5O@ep-restless-cell-ai4zek6b-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DB_URL);

export async function GET() {
    try {
        const bins = await sql`SELECT * FROM "Bin" ORDER BY id ASC`;
        return NextResponse.json(bins);
    } catch (error: any) {
        console.error("Fetch bins error:", error);
        return NextResponse.json({
            error: "Failed to fetch bins",
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

// Updated 2026-02-27T04:02:00Z - 支持 items JSON 字段更新
export async function POST(request: Request) {
    try {
        const data = (await request.json()) as any;
        const { id, updates } = data;

        const sku = updates.sku || null;
        const quantity = updates.quantity || 0;
        const items = JSON.stringify(updates.items || []);

        const bin = await sql`
            UPDATE "Bin" 
            SET sku = ${sku}, quantity = ${quantity}, items = ${items}::jsonb, "updatedAt" = NOW() 
            WHERE id = ${id} 
            RETURNING *
        `;

        return NextResponse.json(bin[0]);
    } catch (error) {
        console.error("Update bin error:", error);
        return NextResponse.json({ error: "Failed to update bin" }, { status: 500 });
    }
}
