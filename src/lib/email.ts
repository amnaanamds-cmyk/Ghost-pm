import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";

/**
 * Transactional email via Resend. Without RESEND_API_KEY every send is a logged no-op,
 * so the app works fine without email configured.
 */
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

let resend: Resend | null = null;

export async function sendEmail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}) {
  if (!emailEnabled()) {
    console.info(`[email disabled] would send "${msg.subject}" to ${msg.to}`);
    return { sent: false as const };
  }
  resend ??= new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM!, ...msg });
  if (error) {
    console.error("Email send failed", msg.subject, error);
    return { sent: false as const, error: error.message };
  }
  return { sent: true as const };
}

// ---------- Unsubscribe tokens ----------

const sign = (userId: string) =>
  createHmac("sha256", process.env.AUTH_SECRET ?? "dev").update(`unsubscribe:${userId}`).digest("base64url");

export function unsubscribeUrl(baseUrl: string, userId: string) {
  return `${baseUrl}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;
}

export function verifyUnsubscribe(userId: string, token: string) {
  const a = Buffer.from(sign(userId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- Templates ----------

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(body: string, footer = "") {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#171717">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="font-weight:600;font-size:16px;margin-bottom:16px">👻 Ghost PM</div>
<div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:24px;font-size:14px;line-height:1.6">${body}</div>
<div style="color:#737373;font-size:12px;margin-top:16px">${footer}</div>
</div></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0 8px"><a href="${esc(href)}" style="background:#171717;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">${esc(label)}</a></p>`;

export function welcomeEmail(opts: { name?: string | null; appUrl: string }) {
  const hi = opts.name ? `Hi ${esc(opts.name.split(" ")[0])},` : "Hi,";
  return {
    subject: "Welcome to Ghost PM 👻",
    html: layout(`<p>${hi}</p>
<p>Ghost PM is your AI product manager: dump bugs, ideas and screenshots, and get prioritized tasks plus ready-to-paste prompts for Claude Code or Cursor.</p>
<p><b>Get started in 60 seconds:</b></p>
<ol><li>Create a project and describe your stack</li><li>Dump anything into the box — text, voice or a screenshot</li><li>Click <i>Generate agent prompt</i> on a task and paste it into your agent</li></ol>
${button(`${opts.appUrl}/dashboard`, "Open Ghost PM")}`),
    text: `${hi}\n\nWelcome to Ghost PM. Create a project, dump anything into it, and generate agent prompts.\n\n${opts.appUrl}/dashboard`,
  };
}

export function inviteEmail(opts: { inviter: string; workspace: string; url: string }) {
  return {
    subject: `${opts.inviter} invited you to ${opts.workspace} on Ghost PM`,
    html: layout(
      `<p><b>${esc(opts.inviter)}</b> invited you to collaborate in <b>${esc(opts.workspace)}</b> on Ghost PM.</p>${button(opts.url, "Accept invite")}<p style="color:#737373;font-size:12px">This link expires in 7 days and can be used once.</p>`
    ),
    text: `${opts.inviter} invited you to ${opts.workspace} on Ghost PM.\n\nAccept: ${opts.url}\n\nThe link expires in 7 days.`,
  };
}

export type DigestTask = { title: string; priority: string; reason?: string };

export function digestEmail(opts: {
  workspace: string;
  projects: { name: string; url: string; thisWeek: DigestTask[]; openCount: number; doneThisWeek: number }[];
  unsubscribe: string;
}) {
  const sections = opts.projects
    .map((p) => {
      const items = p.thisWeek
        .map(
          (t) =>
            `<li><b>[${esc(t.priority)}]</b> ${esc(t.title)}${t.reason ? `<br><span style="color:#737373">${esc(t.reason)}</span>` : ""}</li>`
        )
        .join("");
      return `<h3 style="margin:20px 0 4px;font-size:15px"><a href="${esc(p.url)}" style="color:#171717">${esc(p.name)}</a></h3>
<p style="margin:0;color:#737373;font-size:12px">${p.openCount} open · ${p.doneThisWeek} done in the last 7 days</p>
${items ? `<ol style="padding-left:20px">${items}</ol>` : `<p>No plan yet — hit <i>Plan my week</i>.</p>`}`;
    })
    .join("");
  const text = opts.projects
    .map((p) => `${p.name} (${p.openCount} open)\n${p.thisWeek.map((t, i) => `  ${i + 1}. [${t.priority}] ${t.title}`).join("\n")}\n  ${p.url}`)
    .join("\n\n");
  return {
    subject: `Your week in ${opts.workspace}`,
    html: layout(
      `<p>Here's what matters this week in <b>${esc(opts.workspace)}</b>:</p>${sections}`,
      `You get this weekly digest because you're a member of ${esc(opts.workspace)}. <a href="${esc(opts.unsubscribe)}" style="color:#737373">Unsubscribe</a>`
    ),
    text: `Your week in ${opts.workspace}\n\n${text}\n\nUnsubscribe: ${opts.unsubscribe}`,
  };
}
