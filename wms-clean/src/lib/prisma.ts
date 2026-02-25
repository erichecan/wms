import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { neon, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const rawUrl = process.env.NEON_DATABASE_URL || "";
const sanitizedUrl = rawUrl.trim().replace(/^["']|["']$/g, '');

const sql = neon(sanitizedUrl);
const adapter = new PrismaNeon(sql as any);

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: ["query"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
