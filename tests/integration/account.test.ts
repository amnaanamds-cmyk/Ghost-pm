import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { accountDeletionPlan, deleteAccount, exportAccountData } from "@/lib/account";
import { makeUser, makeWorkspace, resetDb } from "../setup/db";

describe("account deletion", () => {
  beforeEach(resetDb);

  it("blocks when the user is the only owner of a team with other members", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const team = await makeWorkspace(a.id, { name: "Team" });
    await db.membership.create({ data: { workspaceId: team.id, userId: b.id, role: "MEMBER" } });
    const plan = await accountDeletionPlan(a.id);
    expect(plan.blockers.join()).toMatch(/only owner/);
    await expect(deleteAccount(a.id)).rejects.toThrow(/only owner/);
  });

  it("blocks when a sole-member workspace has a live subscription", async () => {
    const a = await makeUser();
    await makeWorkspace(a.id, { personal: true, plan: "PRO", lsSubscriptionId: "s1", subscriptionStatus: "active" });
    expect((await accountDeletionPlan(a.id)).blockers.join()).toMatch(/Cancel the Pro subscription/);
  });

  it("deletes private workspaces but keeps shared content without authorship", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const personal = await makeWorkspace(b.id, { personal: true });
    await db.project.create({ data: { workspaceId: personal.id, name: "Private" } });
    const team = await makeWorkspace(a.id, { name: "Team" });
    await db.membership.create({ data: { workspaceId: team.id, userId: b.id, role: "MEMBER" } });
    const shared = await db.project.create({ data: { workspaceId: team.id, name: "Shared", createdById: b.id } });
    const task = await db.task.create({ data: { projectId: shared.id, title: "T", assigneeId: b.id } });
    await db.taskComment.create({ data: { taskId: task.id, authorId: b.id, body: "hi" } });

    await deleteAccount(b.id);

    expect(await db.user.findUnique({ where: { id: b.id } })).toBeNull();
    expect(await db.workspace.findUnique({ where: { id: personal.id } })).toBeNull();
    expect(await db.project.findFirst({ where: { name: "Private" } })).toBeNull();
    expect(await db.project.findUniqueOrThrow({ where: { id: shared.id } })).toMatchObject({ createdById: null });
    expect(await db.task.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({ assigneeId: null });
    expect(await db.taskComment.findFirstOrThrow({ where: { taskId: task.id } })).toMatchObject({ authorId: null, body: "hi" });
    expect(await db.membership.count({ where: { workspaceId: team.id } })).toBe(1);
  });

  it("exports the user's data without secrets", async () => {
    const a = await makeUser();
    await db.account.create({
      data: { userId: a.id, type: "oauth", provider: "github", providerAccountId: "1", access_token: "gho_SECRET" },
    });
    const ws = await makeWorkspace(a.id);
    await db.project.create({ data: { workspaceId: ws.id, name: "Mine", tasks: { create: { title: "Do it" } } } });
    const data = await exportAccountData(a.id);
    expect(data.workspaces[0].projects[0].tasks[0].title).toBe("Do it");
    expect(JSON.stringify(data)).not.toContain("gho_SECRET");
  });
});
