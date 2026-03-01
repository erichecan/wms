// Updated 2026-02-27T05:55:00Z - 闭环 smoke 测试：首页、通道页、bin 弹窗、3D 视图
import { test, expect } from "@playwright/test";

test.describe("首页", () => {
    test("加载成功并显示欢迎语与扫码入口", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByText("Welcome to wMS Pro")).toBeVisible();
        await expect(page.getByRole("button", { name: /扫描通道二维码/ })).toBeVisible();
    });

    test("点击 Default Aisle (K1) 可进入通道页", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("link", { name: /Default Aisle \(K1\)/ }).click();
        await expect(page).toHaveURL(/\/aisle\/K1/);
        await expect(page.getByText("Back to Home")).toBeVisible();
    });
});

test.describe("通道页 /aisle/K1", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/aisle/K1");
    });

    test("显示通道 2D 图", async ({ page }) => {
        await expect(page.getByText("Back to Home")).toBeVisible();
        await expect(page.getByText(/Aisle K1/)).toBeVisible();
        await expect(page.getByText("Layer 1")).toBeVisible({ timeout: 10000 });
    });

    test("3D 视图切换按钮可见并可切换", async ({ page }) => {
        const toggle3D = page.getByRole("button", { name: /3D Perspective|2D Plan View/ });
        await expect(toggle3D).toBeVisible();
        await toggle3D.click();
        await expect(page.getByText("2D Plan View")).toBeVisible();
    });

    test("点击 bin 可打开弹窗", async ({ page }) => {
        // 等待 grid 加载，点击第一个 bin 格子
        const binCell = page.locator(".rounded-lg.border-2").first();
        await binCell.waitFor({ state: "visible", timeout: 10000 });
        await binCell.click();
        // Bin 弹窗通过 createPortal 挂载到 body，有 fixed inset-0
        const modal = page.locator(".fixed.inset-0").first();
        await expect(modal).toBeVisible({ timeout: 5000 });
    });
});

test.describe("Admin Layout", () => {
    test("布局管理页可访问", async ({ page }) => {
        await page.goto("/admin/layout");
        await expect(page).toHaveURL(/\/admin\/layout/);
        // 页面有内容即可
        const body = page.locator("body");
        await expect(body).toContainText(/Layout|布局|通道|aisle/i, { timeout: 8000 });
    });
});
