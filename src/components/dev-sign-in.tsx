import { FlaskConical } from "lucide-react";
import { devSignIn } from "@/app/actions/dev-auth";
import { devLoginEnabled } from "@/lib/config";
import { Button } from "@/components/ui/button";

/** Renders only in local development with ENABLE_DEV_LOGIN=true. */
export function DevSignIn({ redirectTo = "/dashboard", size = "default" }: { redirectTo?: string; size?: "default" | "lg" }) {
  if (!devLoginEnabled()) return null;
  return (
    <form action={devSignIn} className="flex items-center gap-2">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input
        name="name"
        defaultValue="Demo User"
        aria-label="Demo user name"
        className="border-input dark:bg-input/30 h-9 w-36 rounded-md border bg-transparent px-2 text-sm"
      />
      <Button type="submit" variant="outline" size={size}>
        <FlaskConical /> Dev sign-in
      </Button>
    </form>
  );
}
