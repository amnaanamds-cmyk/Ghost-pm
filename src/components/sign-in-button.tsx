import { GithubIcon } from "@/components/github-icon";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export function SignInButton({
  label = "Sign in with GitHub",
  size = "default",
}: {
  label?: string;
  size?: "default" | "sm" | "lg";
}) {
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
