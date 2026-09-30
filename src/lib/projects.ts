import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

/** Loads a project owned by the user, or 404s. Use for every project-scoped read/write. */
export async function getOwnedProject(userId: string, projectId: string) {
  const project = await db.project.findFirst({ where: { id: projectId, userId } });
  if (!project) notFound();
  return project;
}
