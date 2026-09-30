"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";
import { organizeCapture } from "@/lib/organize";
import { actionError, type ActionResult } from "@/lib/action-result";

const captureSchema = z
  .object({
    text: z.string().trim().max(20_000).default(""),
    imageUrl: z
      .string()
      .regex(/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/, "Unsupported image")
      .max(6_000_000, "Image too large")
      .nullable()
      .default(null),
    usedVoice: z.boolean().default(false),
  })
  .refine((c) => c.text.length > 0 || c.imageUrl, "Type, paste a screenshot, or record something first");

export type CaptureInput = z.input<typeof captureSchema>;

type OrganizeOutcome = { captureId: string; taskCount: number; aiError?: string };

async function runOrganizer(captureId: string): Promise<Omit<OrganizeOutcome, "captureId">> {
  try {
    return { taskCount: await organizeCapture(captureId) };
  } catch (e) {
    console.error("organizer failed", e);
    return { taskCount: 0, aiError: e instanceof Error ? e.message : "AI organizer failed" };
  }
}

/** Saves the capture (always), then asks Claude to turn it into tasks. */
export async function createCapture(projectId: string, input: CaptureInput): Promise<ActionResult<OrganizeOutcome>> {
  try {
    const userId = await requireUserId();
    await getOwnedProject(userId, projectId);
    const parsed = captureSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid capture" };
    const { text, imageUrl, usedVoice } = parsed.data;

    const kinds = [text && (usedVoice ? "voice" : "text"), imageUrl && "image"].filter(Boolean);
    const source = kinds.length > 1 ? "mixed" : (kinds[0] as string);

    const capture = await db.capture.create({ data: { projectId, text, imageUrl, source } });
    const outcome = await runOrganizer(capture.id);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, data: { captureId: capture.id, ...outcome } };
  } catch (e) {
    return actionError(e);
  }
}

/** Retry the organizer on a capture that produced no tasks (e.g. the AI call failed). */
export async function reorganizeCapture(captureId: string): Promise<ActionResult<OrganizeOutcome>> {
  try {
    const userId = await requireUserId();
    const capture = await db.capture.findFirst({ where: { id: captureId, project: { userId } } });
    if (!capture) return { ok: false, error: "Capture not found" };
    const outcome = await runOrganizer(capture.id);
    revalidatePath(`/projects/${capture.projectId}`);
    return { ok: true, data: { captureId, ...outcome } };
  } catch (e) {
    return actionError(e);
  }
}
