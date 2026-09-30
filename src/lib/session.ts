import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Returns the signed-in user's id or redirects to the landing page. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  return session.user.id;
}
