"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { assertRole, getProjectForUser, requireWorkspace } from "@/lib/workspace";
import { actionError, UserError, type ActionResult } from "@/lib/action-result";
import { listRepos, type RepoSummary } from "@/lib/github";
import { deleteImages, imageRefsFor } from "@/lib/storage";

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
  if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? "Invalid project");
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
    const images = await imageRefsFor({ projectId: id });
    await db.project.delete({ where: { id } });
    await deleteImages(images);
    revalidatePath("/dashboard");
  } catch (e) {
    return actionError(e);
  }
  redirect("/dashboard");
}

export async function listMyRepos(): Promise<ActionResult<RepoSummary[]>> {
  try {
    const userId = await requireUserId();
    return { ok: true, data: await listRepos(userId) };
  } catch (e) {
    return actionError(e, "Couldn't load your GitHub repos");
  }
}

const SAMPLE_TASKS = [
  { title: "Fix signup button overflow on mobile", why: "The CTA runs off-screen under 380px wide, so mobile visitors can't sign up.", priority: "P0", status: "todo" },
  { title: "Send a welcome email after signup", why: "New users get no confirmation and churn before their second session.", priority: "P1", status: "doing" },
  { title: "Add dark mode", why: "Most requested feature; devs use the app at night.", priority: "P2", status: "todo" },
  { title: "Export data as CSV", why: "Power users want to analyze their data in spreadsheets.", priority: "P3", status: "todo" },
  { title: "Set up error monitoring", why: "We only hear about bugs when users complain.", priority: "P1", status: "done" },
] as const;

/** Creates a demo project so new users can explore the board, prompts and roadmap immediately. */
export async function createSampleProject(): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId, workspace } = await requireWorkspace();
    const project = await db.project.create({
      data: {
        workspaceId: workspace.id,
        createdById: userId,
        name: "Sample: Habit Tracker",
        description: "A habit tracker for indie devs. Users log daily habits and see streaks. (Sample project — delete anytime.)",
        techStack: "Next.js 15, Supabase, Tailwind, Resend",
        tasks: { create: SAMPLE_TASKS.map((t) => ({ ...t })) },
      },
    });
    revalidatePath("/dashboard");
    return { ok: true, data: { id: project.id } };
  } catch (e) {
    return actionError(e);
  }
}
