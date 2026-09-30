import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export function UserMenu({ name, image }: { name?: string | null; image?: string | null }) {
  return (
    <div className="flex items-center gap-2">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-7 rounded-full" />
      ) : null}
      <span className="hidden text-sm sm:inline">{name}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button variant="ghost" size="icon" aria-label="Sign out">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}
