import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { encryptSecret } from "@/lib/crypto";

const baseAdapter = PrismaAdapter(db);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...baseAdapter,
    // Encrypt OAuth tokens before the adapter stores them.
    linkAccount: (account) =>
      baseAdapter.linkAccount!({
        ...account,
        access_token: encryptSecret(account.access_token) ?? undefined,
        refresh_token: encryptSecret(account.refresh_token) ?? undefined,
      }),
  },
  session: { strategy: "database" },
  providers: [
    GitHub({
      // `repo` lets us create issues on the user's (private) repos with the same token.
      authorization: { params: { scope: "read:user user:email repo" } },
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          githubLogin: profile.login,
        };
      },
    }),
  ],
  pages: { signIn: "/" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    // Every user starts with a personal workspace.
    async createUser({ user }) {
      if (!user.id) return;
      await db.workspace.create({
        data: {
          name: `${user.name || "My"}'s workspace`,
          personal: true,
          members: { create: { userId: user.id, role: "OWNER" } },
        },
      });
      if (user.email) {
        const base = (process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
        await sendEmail({ to: user.email, ...welcomeEmail({ name: user.name, appUrl: base }) }).catch((e) =>
          console.error("welcome email failed", e)
        );
      }
    },
    // The Prisma adapter only stores tokens on first link; refresh them on every sign-in
    // so a re-login (e.g. after granting new scopes) gives us a working token.
    async signIn({ user, account, profile }) {
      if (!account || account.provider !== "github" || !user.id) return;
      await db.account.updateMany({
        where: { provider: "github", providerAccountId: account.providerAccountId },
        data: {
          access_token: encryptSecret(account.access_token),
          scope: account.scope,
          token_type: account.token_type,
          expires_at: account.expires_at,
          refresh_token: encryptSecret(account.refresh_token),
        },
      });
      const login = (profile as { login?: string } | undefined)?.login;
      if (login) await db.user.update({ where: { id: user.id }, data: { githubLogin: login } });
    },
  },
});
