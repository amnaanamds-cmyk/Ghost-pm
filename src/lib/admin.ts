import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";

const adminList = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export function isAdmin(user: { email?: string | null; githubLogin?: string | null }) {
  const list = adminList();
  return (
    (!!user.email && list.includes(user.email.toLowerCase())) ||
    (!!user.githubLogin && list.includes(user.githubLogin.toLowerCase()))
  );
}

/** 404s (rather than 403s) for non-admins so the admin area isn't discoverable. */
export async function requireAdmin() {
  const userId = await requireUserId();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!isAdmin(user)) notFound();
  return user;
}
