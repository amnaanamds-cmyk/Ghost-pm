import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { readImage } from "@/lib/storage";
import { memberOfProject } from "@/lib/workspace";

/** Serves a capture's screenshot to workspace members only (buckets stay private). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const capture = await db.capture.findFirst({
    where: { id, ...memberOfProject(session.user.id) },
    select: { imageUrl: true },
  });
  const img = capture?.imageUrl ? await readImage(capture.imageUrl) : null;
  if (!img) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new Response(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.contentType,
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
