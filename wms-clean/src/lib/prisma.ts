import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = global as unknown as { prisma_v5: PrismaClient };

// Fallback to ensuring the user's explicit env url is used.
let rawUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "";
if (!rawUrl) {
    // Hardcoded safety net during Next.js HMR bugs
    rawUrl = "postgresql://neondb_owner:npg_NqtkoQb4fK5O@ep-restless-cell-ai4zek6b-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
}

const sanitizedUrl = rawUrl.trim().replace(/^["']|["']$/g, '');

const pool = new Pool({ connectionString: sanitizedUrl });
const adapter = new PrismaNeon(pool as any);

export const prisma =
    globalForPrisma.prisma_v5 ||
    new PrismaClient({
        adapter,
        log: ["query"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma_v5 = prisma;
