import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_NqtkoQb4fK5O@ep-restless-cell-ai4zek6b-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DB_URL);

export async function GET() {
    try {
        const dbAisles = await sql`SELECT DISTINCT col FROM "Bin" ORDER BY col ASC`;
        const layoutData = [];

        for (const row of dbAisles) {
            const aisleCol = (row as any).col;
            const maxRowRecord = await sql`SELECT row FROM "Bin" WHERE col = ${aisleCol} ORDER BY row DESC LIMIT 1`;
            const maxLayerRecord = await sql`SELECT layer FROM "Bin" WHERE col = ${aisleCol} ORDER BY layer DESC LIMIT 1`;

            if (maxRowRecord.length > 0 && maxLayerRecord.length > 0) {
                layoutData.push({
                    id: aisleCol,
                    maxRow: (maxRowRecord[0] as any).row,
                    maxLayer: (maxLayerRecord[0] as any).layer,
                });
            }
        }

        return NextResponse.json({
            success: true,
            layout: layoutData
        });

    } catch (error: any) {
        console.error("Layout API Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch warehouse layout", details: error.message },
            { status: 500 }
        );
    }
}
