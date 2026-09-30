import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hit } from "@/lib/rate-limit";
import { exportAccountData } from "@/lib/account";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!(await hit("export", session.user.id))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const data = await exportAccountData(session.user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ghost-pm-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
