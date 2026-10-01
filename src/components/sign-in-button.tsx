import { GithubIcon } from "@/components/github-icon";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

import { githubAuthConfigured } from "@/lib/config";

export function SignInButton({
  label = "Sign in with GitHub",
  size = "default",
}: {
  label?: string;
  size?: "default" | "sm" | "lg";
}) {
  if (!githubAuthConfigured()) {
    return (
      <Button size={size} disabled title="Set AUTH_GITHUB_ID and AUTH_GITHUB_SECRET to enable GitHub sign-in">
        <GithubIcon /> {label}
      </Button>
    );
  }
  return (
    <form
      action={async () => {
        "use server";
        await signIn("github", { redirectTo: "/dashboard" });
      }}
    >
      <Button type="submit" size={size}>
        <GithubIcon />
        {label}
      </Button>
    </form>
  );
}
