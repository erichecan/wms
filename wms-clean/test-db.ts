import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NqtkoQb4fK5O@ep-restless-cell-ai4zek6b-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require");
async function test() {
    try {
        const result = await sql`SELECT 1 as test`;
        console.log("Connection successful:", result);
    } catch (err) {
        console.error("Connection failed:", err);
    }
}
test();
