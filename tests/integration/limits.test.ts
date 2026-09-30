import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { assertCanCreateTasks, getUsage, LimitError, recordTasks } from "@/lib/limits";
import { makeUser, makeWorkspace, resetDb } from "../setup/db";

vi.mock("@/lib/ai", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai")>()),
  generateJson: vi.fn(async () => [
    { title: "A", why: "", priority: "P0" },
    { title: "B", why: "", priority: "P1" },
    { title: "C", why: "", priority: "P2" },
  ]),
}));

describe("monthly task limits", () => {
  let wsId: string;
  beforeEach(async () => {
    await resetDb();
    const u = await makeUser();
    wsId = (await makeWorkspace(u.id)).id;
  });

  it("counts usage and blocks at the limit", async () => {
    await recordTasks(wsId, 20);
    expect(await getUsage(wsId)).toMatchObject({ used: 20, limit: 20, remaining: 0 });
    await expect(assertCanCreateTasks(wsId)).rejects.toBeInstanceOf(LimitError);
  });

  it("resets when a new month starts", async () => {
    await db.workspace.update({ where: { id: wsId }, data: { usagePeriod: "2000-01", tasksThisPeriod: 20 } });
    expect((await getUsage(wsId)).used).toBe(0);
  });

  it("is unlimited on Pro", async () => {
    await db.workspace.update({ where: { id: wsId }, data: { plan: "PRO", tasksThisPeriod: 999 } });
    expect((await getUsage(wsId)).remaining).toBe(Infinity);
  });

  it("organizer keeps only what fits and reports the rest as dropped", async () => {
    const { organizeCapture } = await import("@/lib/organize");
    const project = await db.project.create({ data: { workspaceId: wsId, name: "P" } });
    const capture = await db.capture.create({ data: { projectId: project.id, text: "three things" } });
    await recordTasks(wsId, 18);
    await expect(organizeCapture(capture.id)).resolves.toEqual({ created: 2, dropped: 1 });
    expect(await db.task.count({ where: { projectId: project.id } })).toBe(2);
    expect((await getUsage(wsId)).used).toBe(20);
  });

  it("organizer doesn't call the AI once the limit is reached", async () => {
    const ai = await import("@/lib/ai");
    const { organizeCapture } = await import("@/lib/organize");
    const project = await db.project.create({ data: { workspaceId: wsId, name: "P" } });
    const capture = await db.capture.create({ data: { projectId: project.id, text: "x" } });
    await recordTasks(wsId, 20);
    vi.mocked(ai.generateJson).mockClear();
    await expect(organizeCapture(capture.id)).rejects.toBeInstanceOf(LimitError);
    expect(ai.generateJson).not.toHaveBeenCalled();
  });
});
