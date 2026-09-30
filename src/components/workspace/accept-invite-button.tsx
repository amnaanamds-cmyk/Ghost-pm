"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { acceptInvite } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await acceptInvite(token);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Welcome to the team!");
          router.push("/dashboard");
          router.refresh();
        })
      }
    >
      {pending && <Loader2 className="animate-spin" />} Accept invite
    </Button>
  );
}
