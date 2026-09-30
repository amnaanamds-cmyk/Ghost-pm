"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { assertRole, getProjectForUser, requireWorkspace } from "@/lib/workspace";
import { actionError, type ActionResult } from "@/lib/action-result";

const projectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(5000).default(""),
  techStack: z.string().trim().max(1000).default(""),
  githubRepo: z
    .string()
    .trim()
    .transform((v) => v.replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/, "").replace(/\/$/, ""))
    .refine((v) => v === "" || /^[\w.-]+\/[\w.-]+$/.test(v), "GitHub repo must look like owner/repo")
    .transform((v) => (v === "" ? null : v)),
});

export type ProjectInput = z.input<typeof projectSchema>;

function parse(input: ProjectInput) {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid project");
  return parsed.data;
}

export async function createProject(input: ProjectInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId, workspace } = await requireWorkspace();
    const project = await db.project.create({
      data: { ...parse(input), workspaceId: workspace.id, createdById: userId },
    });
    revalidatePath("/dashboard");
    return { ok: true, data: { id: project.id } };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateProject(id: string, input: ProjectInput): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await getProjectForUser(userId, id);
    await db.project.update({ where: { id }, data: parse(input) });
    revalidatePath(`/projects/${id}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const { project, membership } = await getProjectForUser(userId, id);
    // Admins can delete any project; members only ones they created.
    if (project.createdById !== userId) assertRole(membership, "ADMIN");
    await db.project.delete({ where: { id } });
    revalidatePath("/dashboard");
  } catch (e) {
    return actionError(e);
  }
  redirect("/dashboard");
}
