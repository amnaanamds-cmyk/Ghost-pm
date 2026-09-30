import { expect, test } from "@playwright/test";

test("landing page shows pricing and sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The product manager for your AI coding agents");
  await expect(page.locator("#pricing")).toContainText("/seat/mo");
  await expect(page.getByRole("button", { name: /Start free with GitHub/ }).first()).toBeVisible();
});

test("app routes redirect signed-out visitors", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/$/);
});

test("legal pages and health check", async ({ page, request }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  expect(health.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});
