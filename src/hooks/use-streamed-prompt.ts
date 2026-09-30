"use client";

import { useCallback, useRef, useState } from "react";

const ERROR_SENTINEL = "\n\u0000ERROR:";

/** Streams /api/tasks/:id/agent-prompt into state as it's written. */
export function useStreamedPrompt(taskId: string) {
  const [text, setText] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setText("");
    let acc = "";
    try {
      const res = await fetch(`/api/tasks/${taskId}/agent-prompt`, { method: "POST", signal: controller.signal });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        return { ok: false, error: err.error ?? "Request failed" };
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const errAt = acc.indexOf(ERROR_SENTINEL);
        if (errAt !== -1) return { ok: false, error: acc.slice(errAt + ERROR_SENTINEL.length) || "Generation failed" };
        setText(acc);
      }
      return { ok: true, text: acc.trim() };
    } catch (e) {
      if (controller.signal.aborted) return { ok: false, error: "Cancelled" };
      return { ok: false, error: e instanceof Error ? e.message : "Network error" };
    } finally {
      setStreaming(false);
    }
  }, [taskId]);

  const reset = useCallback(() => setText(null), []);
  const stop = useCallback(() => abortRef.current?.abort(), []);
  return { text, streaming, start, reset, stop };
}
