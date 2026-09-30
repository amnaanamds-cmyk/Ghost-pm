// Local stand-in for the Anthropic Messages API, GitHub REST API and Resend, used by E2E tests.
import http from "node:http";

const PORT = Number(process.env.MOCK_PORT || 4010);
const message = (text) => ({
  id: "msg_mock",
  type: "message",
  role: "assistant",
  model: "mock",
  content: [{ type: "text", text }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
});

function claudeReply(body) {
  const system = body.system || "";
  const user = JSON.stringify(body.messages?.[0]?.content ?? "");
  if (system.includes("turn it into clean, actionable tasks")) {
    if (user.includes("NOTHING_ACTIONABLE")) return "[]";
    return JSON.stringify([
      { title: "Fix signup button on mobile", why: "Mobile visitors can't sign up.", priority: "P0" },
      { title: "Add dark mode", why: "Most requested feature.", priority: "P2" },
    ]);
  }
  if (system.includes("writing prompts for autonomous AI coding agents")) {
    return "## Goal\nFix the signup button on mobile.\n\n## Acceptance criteria\n- [ ] Button fits at 360px";
  }
  if (system.includes("decide what they should build THIS WEEK")) {
    return JSON.stringify({ summary: "Unblock signups first.", thisWeek: [{ ref: "T1", reason: "Blocks revenue." }], later: [], ignore: [] });
  }
  return "{}";
}

http
  .createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : {};
      const json = (status, data) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(data));
      };

      if (req.url === "/v1/messages") {
        const text = claudeReply(body);
        if (!body.stream) return json(200, message(text));
        res.writeHead(200, { "content-type": "text/event-stream" });
        const send = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
        send("message_start", { message: { ...message(""), content: [] } });
        send("content_block_start", { index: 0, content_block: { type: "text", text: "" } });
        for (const chunk of text.match(/.{1,16}/gs) ?? []) send("content_block_delta", { index: 0, delta: { type: "text_delta", text: chunk } });
        send("content_block_stop", { index: 0 });
        send("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 1 } });
        send("message_stop", {});
        return res.end();
      }
      if (req.method === "GET" && req.url.startsWith("/user/repos")) {
        return json(200, [{ full_name: "acme/app", private: true, description: null, has_issues: true, permissions: { push: true } }]);
      }
      if (req.method === "POST" && /^\/repos\/[^/]+\/[^/]+\/issues$/.test(req.url)) {
        return json(201, { html_url: `https://github.com${req.url.replace("/repos", "")}/1` });
      }
      if (req.method === "GET" && /\/issues\/\d+$/.test(req.url)) return json(200, { state: "closed" });
      if (req.method === "POST" && req.url === "/emails") return json(200, { id: "email_1" });
      if (req.url === "/health") return json(200, { ok: true });
      json(404, { error: "not mocked", url: req.url });
    });
  })
  .listen(PORT, () => console.log(`mock server on ${PORT}`));
