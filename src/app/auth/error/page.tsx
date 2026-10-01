import Link from "next/link";
import { Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SignInButton } from "@/components/sign-in-button";
import { legal } from "@/lib/legal";

export const metadata = { title: "Sign-in problem — Ghost PM" };

// Auth.js error codes: https://authjs.dev/reference/core/errors
const MESSAGES: Record<string, { title: string; body: string }> = {
  AccessDenied: {
    title: "Sign-in was cancelled",
    body: "GitHub didn't grant access. Ghost PM needs the repo scope to create issues on your behalf — you can try again anytime.",
  },
  Configuration: {
    title: "Sign-in isn't set up correctly",
    body: "The server's GitHub OAuth settings look wrong (client ID, secret or callback URL). If you run this instance, check AUTH_GITHUB_ID, AUTH_GITHUB_SECRET and AUTH_URL.",
  },
  Verification: {
    title: "That sign-in link has expired",
    body: "Please start the sign-in again.",
  },
  OAuthAccountNotLinked: {
    title: "Account already exists",
    body: "This email is already linked to a different sign-in. Use the method you signed up with.",
  },
};

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error = "" } = await searchParams;
  const msg = MESSAGES[error] ?? {
    title: "Something went wrong signing you in",
    body: "Please try again. If it keeps happening, contact us and mention the code below.",
  };
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md items-center gap-4 p-8 text-center">
        <Ghost className="size-10" />
        <h1 className="text-xl font-semibold">{msg.title}</h1>
        <p className="text-muted-foreground text-sm">{msg.body}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <SignInButton label="Try again" />
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          {error && <>Code: {error} · </>}
          <a className="underline" href={`mailto:${legal.contact}`}>
            Contact support
          </a>
        </p>
      </Card>
    </main>
  );
}
