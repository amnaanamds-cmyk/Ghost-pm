import { expect, test } from "./fixtures";

test.describe.configure({ mode: "serial" });

test("capture → AI tasks → streamed agent prompt → GitHub issue → done", async ({ ownerPage: page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Welcome to Ghost PM")).toBeVisible();

  await page.getByRole("button", { name: "Create your first project" }).click();
  await page.fill("#name", "E2E App");
  await page.fill("#techStack", "Next.js, Postgres");
  await page.fill("#githubRepo", "acme/app");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/projects\//);

  await page.getByPlaceholder(/Dump anything/).fill("signup button is broken on mobile, also dark mode please");
  await page.getByRole("button", { name: "Capture" }).click();
  await expect(page.getByText("Captured → 2 tasks")).toBeVisible();
  const card = page.locator('[data-task="Fix signup button on mobile"]');
  await expect(card).toBeVisible();

  await card.click();
  await page.getByRole("button", { name: "Generate agent prompt" }).click();
  await expect(page.locator("[data-agent-prompt]")).toContainText("Button fits at 360px");

  await page.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(page.getByRole("link", { name: "View issue" })).toHaveAttribute("href", "https://github.com/acme/app/issues/1");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /Sync GitHub/ }).click();
  await expect(page.getByText(/1 closed → done/)).toBeVisible();
  await expect(page.locator('[data-column="done"] [data-task="Fix signup button on mobile"]')).toBeVisible();
});

test("drag a task across the board and plan the week", async ({ ownerPage: page }) => {
  await page.goto("/dashboard");
  await page.getByText("E2E App").click();
  const task = page.locator('[data-task="Add dark mode"]');
  const target = page.locator('[data-column="doing"]');
  // Mouse coordinates are viewport-relative, so bring the board on screen first.
  await page.getByRole("heading", { name: "Board" }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 200));
  const from = (await task.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + 20, from.y + 10);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(from.x + 20 + ((to.x + 40 - from.x - 20) * i) / 12, from.y + 10 + ((to.y + 60 - from.y - 10) * i) / 12);
  }
  await page.mouse.up();
  await expect(page.locator('[data-column="doing"] [data-task="Add dark mode"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-column="doing"] [data-task="Add dark mode"]')).toBeVisible();

  await page.getByRole("button", { name: "Plan my week" }).click();
  await expect(page.getByText("Unblock signups first.")).toBeVisible();
});
