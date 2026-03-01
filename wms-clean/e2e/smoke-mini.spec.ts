// Updated 2026-02-27T06:02:00Z - 最小 smoke 测试
import { test, expect } from "@playwright/test";

test("首页可访问", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Welcome to wMS Pro")).toBeVisible({ timeout: 10000 });
});
