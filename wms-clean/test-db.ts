import { PrismaClient } from "@prisma/client";

async function main() {
    try {
        console.log("Instantiating PrismaClient with url prop...");
        // In Prisma 7, url might be a direct property?
        const prisma = new PrismaClient({ url: process.env.DATABASE_URL });
        const count = await prisma.bin.count();
        console.log("Count with url:", count);
        return;
    } catch (e: any) {
        console.error("Failed with url:", e.message);
    }
}

main();
