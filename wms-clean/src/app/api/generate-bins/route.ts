import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_NqtkoQb4fK5O@ep-restless-cell-ai4zek6b-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DB_URL);

export async function POST() {
    try {
        const dbAisles = await sql`SELECT DISTINCT col FROM "Bin"`;

        let generatedCount = 0;
        const queries = [];

        for (const rowObj of dbAisles) {
            const aisleCol = (rowObj as any).col;
            const maxRowRecord = await sql`SELECT row FROM "Bin" WHERE col = ${aisleCol} ORDER BY row DESC LIMIT 1`;
            const maxLayerRecord = await sql`SELECT layer FROM "Bin" WHERE col = ${aisleCol} ORDER BY layer DESC LIMIT 1`;

            if (maxRowRecord.length > 0 && maxLayerRecord.length > 0) {
                const maxRow = (maxRowRecord[0] as any).row;
                const maxLayer = (maxLayerRecord[0] as any).layer;

                for (let r = 1; r <= maxRow; r++) {
                    for (let l = 1; l <= maxLayer; l++) {
                        const binId = `${aisleCol}-L${l}-R${r}`;
                        // We use INSERT ... ON CONFLICT DO NOTHING natively
                        queries.push(
                            sql`INSERT INTO "Bin" (id, col, row, layer, quantity, sku, "updatedAt") 
                                VALUES (${binId}, ${aisleCol}, ${r}, ${l}, 0, NULL, NOW()) 
                                ON CONFLICT (id) DO NOTHING`
                        );
                        generatedCount++;
                    }
                }
            }
        }

        // Execute inserts sequentially or in small parallel batches
        for (const q of queries) {
            await q;
        }

        return NextResponse.json({ success: true, message: `Ensured ${generatedCount} logical slots exist.` });
    } catch (error: any) {
        console.error("Generator Error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
