// Updated 2026-02-27T05:52:00Z - Playwright smoke 闭环测试配置
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: "html",
    use: {
        baseURL: "http://localhost:3000",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    // 本地测试时需先运行 npm run dev；CI 时自动启动
    ...(process.env.CI ? {
        webServer: {
            command: "npm run dev",
            url: "http://localhost:3000",
            reuseExistingServer: false,
            timeout: 60_000,
        },
    } : {}),
});
