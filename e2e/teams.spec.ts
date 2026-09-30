import { expect, test } from "./fixtures";

test("invite a teammate who joins, sees shared projects, and can't see private ones", async ({ ownerPage, matePage }) => {
  // Owner creates a team workspace with a project
  await ownerPage.goto("/dashboard");
  await ownerPage.getByLabel("Switch workspace").click();
  await ownerPage.getByRole("menuitem", { name: "New workspace" }).click();
  await ownerPage.getByPlaceholder("Acme Inc.").fill("E2E Team");
  await ownerPage.getByRole("button", { name: "Create workspace" }).click();
  await expect(ownerPage.getByLabel("Switch workspace")).toContainText("E2E Team");
  await ownerPage.getByRole("button", { name: "New project" }).click();
  await ownerPage.fill("#name", "Team Project");
  await ownerPage.getByRole("button", { name: "Create project" }).click();
  await expect(ownerPage).toHaveURL(/\/projects\//);

  await ownerPage.goto("/settings/workspace");
  await ownerPage.getByRole("button", { name: "Create invite link" }).click();
  const link = (await ownerPage.locator("[data-invite-link]").textContent())!;

  // Teammate accepts
  await matePage.goto(new URL(link).pathname);
  await expect(matePage.getByRole("heading", { name: "Join E2E Team" })).toBeVisible();
  await matePage.getByRole("button", { name: "Accept invite" }).click();
  await expect(matePage).toHaveURL(/dashboard/);
  await expect(matePage.getByText("Team Project")).toBeVisible();

  // The link is single-use
  await matePage.goto(new URL(link).pathname);
  await expect(matePage.getByRole("heading", { name: "Invite not valid" })).toBeVisible();

  // Members can't reach projects in workspaces they don't belong to
  await ownerPage.goto("/dashboard");
  await ownerPage.getByLabel("Switch workspace").click();
  await ownerPage.getByRole("menuitem", { name: "Olive Owner's workspace" }).click();
  await ownerPage.getByText("E2E App").click();
  await expect(ownerPage).toHaveURL(/\/projects\//);
  const privateUrl = new URL(ownerPage.url()).pathname;
  await matePage.goto(privateUrl);
  await expect(matePage.getByText("Nothing here")).toBeVisible();

  // Members can't manage billing or see admin
  await matePage.goto("/settings/billing");
  await expect(matePage.getByText(/Only workspace owners can manage billing|isn't enabled/)).toBeVisible();
  const admin = await matePage.goto("/admin");
  expect(admin?.status()).toBe(404);
});
