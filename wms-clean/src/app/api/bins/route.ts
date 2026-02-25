import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const bins = await prisma.bin.findMany({
            orderBy: { id: "asc" },
        });
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

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { id, updates } = data;

        const bin = await prisma.bin.update({
            where: { id },
            data: {
                sku: updates.sku,
                quantity: updates.quantity,
            },
        });

        return NextResponse.json(bin);
    } catch (error) {
        console.error("Update bin error:", error);
        return NextResponse.json({ error: "Failed to update bin" }, { status: 500 });
    }
}
