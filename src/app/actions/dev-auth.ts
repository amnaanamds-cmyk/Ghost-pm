"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { devLoginEnabled } from "@/lib/config";
import { ensurePersonalWorkspace } from "@/lib/workspace";

const SESSION_DAYS = 30;

/**
 * Signs in as a local demo user by creating a real database session (same as an OAuth sign-in
 * would). Only works in development with ENABLE_DEV_LOGIN=true.
 */
export async function devSignIn(formData: FormData) {
  if (!devLoginEnabled()) throw new Error("Dev sign-in is disabled.");
  const name = String(formData.get("name") || "Demo User").trim().slice(0, 40) || "Demo User";
  const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "demo";
  const email = `${handle}@demo.local`;

  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { name, email, githubLogin: handle },
  });
  await ensurePersonalWorkspace(user);

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { sessionToken, userId: user.id, expires } });
  (await cookies()).set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });
  redirect(String(formData.get("redirectTo") || "/dashboard"));
}
