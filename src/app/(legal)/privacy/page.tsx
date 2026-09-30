import type { Metadata } from "next";
import { legal } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy — Ghost PM" };

export default function PrivacyPage() {
  const { company, contact, updated } = legal;
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated {updated}</p>
      <p>
        This policy explains what {company} collects when you use Ghost PM, why, and your choices. We collect as little
        as we need to run the product.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Account data</b> from GitHub when you sign in: name, email, avatar, username, and an OAuth access token
          (encrypted before it is stored) used only for the GitHub features you trigger.
        </li>
        <li>
          <b>Content you create</b>: projects, captures (text, voice transcripts, screenshots), tasks, comments,
          roadmaps. Voice is transcribed by your browser; we never receive audio.
        </li>
        <li>
          <b>Billing data</b> is handled by Lemon Squeezy. We receive your subscription status, seat count and customer
          ID — never your card details.
        </li>
        <li>
          <b>Technical data</b>: error reports (with request bodies, cookies, query strings and AI inputs removed) and
          basic server logs used for security and debugging.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide the Service: organizing captures, generating prompts and plans, syncing with GitHub.</li>
        <li>To send transactional email (invites, welcome) and the optional weekly digest.</li>
        <li>To secure the Service, prevent abuse, and fix bugs.</li>
      </ul>
      <p>We don&apos;t sell your data, run ads, or use your content to train AI models.</p>

      <h2>Sub-processors</h2>
      <p>We share data only with providers that help us run the Service:</p>
      <ul>
        <li>Anthropic — AI processing of captures, tasks and project context (API data isn&apos;t used for training).</li>
        <li>GitHub — sign-in and the issue features you use.</li>
        <li>Lemon Squeezy — payments, tax and invoicing (merchant of record).</li>
        <li>Resend — transactional email.</li>
        <li>Sentry — error monitoring.</li>
        <li>Our hosting, database and object-storage providers (e.g. Vercel, Neon/Supabase, Cloudflare R2 / AWS S3).</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use only essential cookies: your sign-in session and your selected workspace. Your theme preference is kept
        in your browser&apos;s local storage. No advertising or cross-site tracking cookies.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        We keep your data while your account is active. When you delete your account (Settings → Account), we delete
        your profile, personal workspace, and any team workspace where you&apos;re the only member — including stored
        screenshots — immediately. Content you contributed to shared workspaces stays with that workspace, with your
        authorship removed. Backups roll off within 30 days.
      </p>

      <h2>Your rights</h2>
      <p>
        You can access and export your data anytime (Settings → Account → Export my data), correct it in the app, or
        delete your account. Depending on where you live (e.g. GDPR, UK GDPR, CCPA) you may have additional rights,
        including objecting to processing or complaining to a supervisory authority. Contact us to exercise them.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit (TLS). Screenshots are stored in private buckets and served only to members of
        the workspace. Access is scoped by workspace membership and role.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${contact}`}>{contact}</a>
      </p>
    </>
  );
}
