import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AIError, describeAIError, streamText } from "@/lib/ai";
import { agentPromptContent } from "@/lib/agent-prompt";
import { AGENT_PROMPT_SYSTEM } from "@/lib/prompts";
import { memberOfProject } from "@/lib/workspace";
import { hit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Streams a freshly generated agent prompt as plain text, saving it when complete. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const task = await db.task.findFirst({
    where: { id, ...memberOfProject(session.user.id) },
    include: { project: true, capture: true },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (!(await hit("agentPrompt", session.user.id))) {
    return NextResponse.json({ error: "You're doing that too fast — please wait a minute." }, { status: 429 });
  }

  let stream: ReturnType<typeof streamText>;
  try {
    stream = streamText({ system: AGENT_PROMPT_SYSTEM, content: await agentPromptContent(task) });
  } catch (e) {
    return NextResponse.json({ error: describeAIError(e) }, { status: 503 });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = "";
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            text += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") throw new AIError("Claude declined this request.");
        if (final.stop_reason === "max_tokens") throw new AIError("The prompt was cut off (output limit reached).");
        if (text.trim()) await db.task.update({ where: { id: task.id }, data: { agentPrompt: text.trim() } });
        controller.close();
      } catch (e) {
        console.error("agent prompt stream failed", e);
        // The client treats this sentinel as an error and keeps the previous prompt.
        controller.enqueue(encoder.encode(`\n\u0000ERROR:${describeAIError(e)}`));
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
