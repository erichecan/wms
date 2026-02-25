import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const cols = ["K1", "K2", "K3", "K4"];
    const binsData = [];

    for (const col of cols) {
        for (let r = 1; r <= 10; r++) {
            for (let l = 1; l <= 3; l++) {
                const hasItem = Math.random() > 0.4;
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

    console.log(`Seeding library ${binsData.length} bins...`);

    for (const bin of binsData) {
        await prisma.bin.upsert({
            where: { id: bin.id },
            update: {
                sku: bin.sku,
                quantity: bin.quantity,
                inboundTime: bin.inboundTime,
            },
            create: bin,
        });
    }

    console.log("Seeding complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
