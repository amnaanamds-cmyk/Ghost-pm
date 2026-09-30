import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

let client: Anthropic | null = null;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — add it to .env to enable AI features.");
  }
  client ??= new Anthropic();
  return client;
}

export const model = () => process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export class AIError extends Error {}

function textOf(message: Anthropic.Message) {
  if (message.stop_reason === "refusal") throw new AIError("Claude declined this request.");
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Pull JSON out of a reply, tolerating ```json fences or stray prose around it. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  const end = Math.max(candidate.lastIndexOf("]"), candidate.lastIndexOf("}"));
  if (start === -1 || end < start) throw new Error("No JSON found in response");
  return JSON.parse(candidate.slice(start, end + 1));
}

async function send(system: string, messages: Anthropic.MessageParam[], maxTokens: number) {
  try {
    return await getClient().messages.create({ model: model(), max_tokens: maxTokens, system, messages });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new AIError("Invalid ANTHROPIC_API_KEY.");
    if (e instanceof Anthropic.RateLimitError) throw new AIError("Claude is rate limited — try again in a minute.");
    if (e instanceof Anthropic.NotFoundError) throw new AIError(`Model "${model()}" not found — check ANTHROPIC_MODEL.`);
    if (e instanceof Anthropic.APIError) throw new AIError(`Claude API error (${e.status ?? "network"}): ${e.message}`);
    throw e;
  }
}

/**
 * Ask Claude for JSON matching `schema`. If the reply isn't valid JSON or fails validation,
 * retry once, showing Claude its own reply and the validation error.
 */
export async function generateJson<S extends z.ZodType>(opts: {
  system: string;
  content: Anthropic.ContentBlockParam[];
  schema: S;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const { system, content, schema, maxTokens = 8000 } = opts;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content }];

  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = textOf(await send(system, messages, maxTokens));
    let problem: string;
    try {
      const parsed = schema.safeParse(extractJson(reply));
      if (parsed.success) return parsed.data;
      problem = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    } catch (e) {
      problem = e instanceof Error ? e.message : "Invalid JSON";
    }
    messages.push(
      { role: "assistant", content: reply || "(empty)" },
      {
        role: "user",
        content: `That response was not valid: ${problem}. Reply again with ONLY the corrected JSON — no prose, no code fences.`,
      }
    );
  }
  throw new AIError("Claude returned malformed JSON twice — please try again.");
}

/** Plain-text generation (used for agent prompts). */
export async function generateText(opts: {
  system: string;
  content: string | Anthropic.ContentBlockParam[];
  maxTokens?: number;
}) {
  const text = textOf(await send(opts.system, [{ role: "user", content: opts.content }], opts.maxTokens ?? 8000));
  if (!text) throw new AIError("Claude returned an empty response.");
  return text;
}

/** Convert a stored data URL into a Claude image block. */
export function imageBlock(dataUrl: string): Anthropic.ImageBlockParam | null {
  const m = dataUrl.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/);
  if (!m) return null;
  return {
    type: "image",
    source: { type: "base64", media_type: m[1] as "image/png" | "image/jpeg" | "image/gif" | "image/webp", data: m[2] },
  };
}
