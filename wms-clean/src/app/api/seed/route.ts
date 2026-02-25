import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
    try {
        const cols = ["K1", "K2", "K3", "K4"];
        const binsData = [];

        for (const col of cols) {
            for (let r = 1; r <= 10; r++) {
                for (let l = 1; l <= 3; l++) {
                    const hasItem = Math.random() > 0.6;
                    binsData.push({
                        id: `${col}-L${l}-R${r}`,
                        col,
                        row: r,
                        layer: l,
                        sku: hasItem ? `SKU-A${Math.floor(Math.random() * 900) + 100}` : null,
                        quantity: hasItem ? Math.floor(Math.random() * 50) + 1 : 0,
                        inboundTime: hasItem ? new Date() : null,
                    });
                }
            }
        }

        // Upsert all bins
        for (const bin of binsData) {
            await prisma.bin.upsert({
                where: { id: bin.id },
                update: {},
                create: bin,
            });
        }

        return NextResponse.json({ message: "Mock data initialized" });
    } catch (error) {
        console.error("Seed error:", error);
        return NextResponse.json({ error: "Failed to seed data" }, { status: 500 });
    }
}
