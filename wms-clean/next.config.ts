// Updated 2026-02-27T07:00:00Z - Cloud Run 部署：standalone 输出
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    images: { unoptimized: process.env.NODE_ENV === "production" },
};

export default nextConfig;
