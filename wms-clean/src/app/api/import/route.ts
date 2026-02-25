import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const { csvData } = await request.json() as { csvData: string };
        if (!csvData) {
            return NextResponse.json({ error: "No CSV data provided" }, { status: 400 });
        }

        const rows = csvData.trim().split("\n");
        if (rows.length < 2) {
            return NextResponse.json({ error: "CSV must contain at least a header and one data row" }, { status: 400 });
        }

        const headers = rows[0].split(",");
        const skuIdx = headers.findIndex((h: string) => h.includes("SKU") || h.includes("商品编码") || h.includes("SKU"));
        const qtyIdx = headers.findIndex((h: string) => h.includes("Qty") || h.includes("Quantity") || h.includes("可用库存"));
        const binIdx = headers.findIndex((h: string) => h.includes("Bin") || h.includes("Location") || h.includes("库位"));

        if (skuIdx === -1 || qtyIdx === -1) {
            return NextResponse.json({ error: "Could not find SKU or Quantity columns" }, { status: 400 });
        }

        const results = { updated: 0, errors: 0, details: [] as string[] };

        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(",");
            const sku = cols[skuIdx]?.trim();
            const qty = parseInt(cols[qtyIdx]?.trim() || "0");
            const binId = binIdx !== -1 ? cols[binIdx]?.trim() : null;

            if (!sku || !binId) continue;

            // Parse ID format F33-01-A
            const binParts = binId.split("-");
            const aisleId = binParts[0] || "Unknown";
            const row = parseInt(binParts[1] || "1");
            const levelChar = binParts[2] || "A";
            const layer = levelChar.toUpperCase().charCodeAt(0) - 64;

            try {
                await prisma.bin.upsert({
                    where: { id: binId },
                    update: { sku, quantity: qty, col: aisleId, row, layer },
                    create: { id: binId, sku, quantity: qty, col: aisleId, row, layer, inboundTime: new Date() }
                });
                results.updated++;
            } catch (err) {
                results.errors++;
                results.details.push(`Row ${i + 1}: Error updating ${binId}`);
            }
        }

        return NextResponse.json({
            message: "Import completed",
            updated: results.updated,
            errors: results.errors,
            details: results.details
        });

    } catch (error) {
        console.error("CSV Import error:", error);
        return NextResponse.json({ error: "Failed to process CSV import" }, { status: 500 });
    }
}
