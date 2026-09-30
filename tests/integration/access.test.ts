import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getProjectForUser } from "@/lib/workspace";
import { makeUser, makeWorkspace, resetDb } from "../setup/db";

describe("workspace isolation", () => {
  beforeEach(resetDb);

  it("members can load a project; outsiders get notFound", async () => {
    const owner = await makeUser("Owner");
    const outsider = await makeUser("Outsider");
    const ws = await makeWorkspace(owner.id);
    const project = await db.project.create({ data: { workspaceId: ws.id, name: "Secret" } });

    const res = await getProjectForUser(owner.id, project.id);
    expect(res.project.name).toBe("Secret");
    expect(res.membership.role).toBe("OWNER");

    await expect(getProjectForUser(outsider.id, project.id)).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });
  });
});
