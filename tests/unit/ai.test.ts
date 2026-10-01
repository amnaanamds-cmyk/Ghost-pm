import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", async (orig) => {
  const actual = await orig<typeof import("@anthropic-ai/sdk")>();
  class FakeAnthropic {
    beta = { messages: { create } };
  }
  Object.assign(FakeAnthropic, actual.default);
  return { ...actual, default: FakeAnthropic };
});

const reply = (text: string, stop_reason = "end_turn") => ({ content: [{ type: "text", text }], stop_reason });
const schema = z.array(z.object({ title: z.string(), priority: z.enum(["P0", "P1", "P2", "P3"]) }));

describe("generateJson", () => {
  beforeEach(() => {
    create.mockReset();
    process.env.ANTHROPIC_API_KEY = "test";
  });

  it("parses JSON even inside code fences", async () => {
    const { generateJson } = await import("@/lib/ai");
    create.mockResolvedValueOnce(reply('```json\n[{"title":"A","priority":"P1"}]\n```'));
    await expect(generateJson({ system: "s", content: [{ type: "text", text: "x" }], schema })).resolves.toEqual([
      { title: "A", priority: "P1" },
    ]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("retries once with the validation error, then succeeds", async () => {
    const { generateJson } = await import("@/lib/ai");
    create
      .mockResolvedValueOnce(reply('[{"title":"A","priority":"URGENT"}]'))
      .mockResolvedValueOnce(reply('[{"title":"A","priority":"P0"}]'));
    const out = await generateJson({ system: "s", content: [{ type: "text", text: "x" }], schema });
    expect(out[0].priority).toBe("P0");
    expect(create).toHaveBeenCalledTimes(2);
    const retryMessages = create.mock.calls[1][0].messages;
    expect(retryMessages).toHaveLength(3);
    expect(retryMessages[2].content).toMatch(/not valid.*priority/);
  });

  it("gives up after two bad replies", async () => {
    const { generateJson } = await import("@/lib/ai");
    create.mockResolvedValue(reply("sorry, no JSON"));
    await expect(generateJson({ system: "s", content: [{ type: "text", text: "x" }], schema })).rejects.toThrow(
      /malformed JSON twice/
    );
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("reports truncated output instead of 'malformed JSON'", async () => {
    const { generateJson } = await import("@/lib/ai");
    create.mockResolvedValueOnce(reply('[{"title":"A","prio', "max_tokens"));
    await expect(generateJson({ system: "s", content: [{ type: "text", text: "x" }], schema })).rejects.toThrow(/cut off/);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("requests server-side refusal fallbacks only for supported models", async () => {
    const { generateText } = await import("@/lib/ai");
    create.mockResolvedValue(reply("ok"));
    process.env.ANTHROPIC_MODEL = "claude-opus-5-5";
    await generateText({ system: "s", content: "x" });
    expect(create.mock.calls[0][0]).toMatchObject({ fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    expect(create.mock.calls[0][0].max_tokens).toBeGreaterThanOrEqual(16000);

    process.env.ANTHROPIC_MODEL = "claude-haiku-4-5";
    await generateText({ system: "s", content: "x" });
    expect(create.mock.calls[1][0].fallbacks).toBeUndefined();
    expect(create.mock.calls[1][0].betas).toBeUndefined();
    delete process.env.ANTHROPIC_MODEL;
  });

  it("surfaces refusals", async () => {
    const { generateJson } = await import("@/lib/ai");
    create.mockResolvedValueOnce(reply("", "refusal"));
    await expect(generateJson({ system: "s", content: [{ type: "text", text: "x" }], schema })).rejects.toThrow(
      /declined/
    );
  });
});
