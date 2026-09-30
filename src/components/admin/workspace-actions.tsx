"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminResetUsage, adminSetPlan } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function AdminWorkspaceActions({
  id,
  plan,
  managedByBilling,
}: {
  id: string;
  plan: "FREE" | "PRO";
  managedByBilling: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => ReturnType<typeof adminResetUsage>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(ok);
      else toast.error(res.error);
    });
  return (
    <div className="flex justify-end gap-1">
      {pending && <Loader2 className="size-4 animate-spin self-center" />}
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => adminResetUsage(id), "Usage reset")}>
        Reset usage
      </Button>
      {!managedByBilling && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => adminSetPlan(id, plan === "PRO" ? "FREE" : "PRO"), plan === "PRO" ? "Downgraded" : "Pro granted")}
        >
          {plan === "PRO" ? "Revoke Pro" : "Grant Pro"}
        </Button>
      )}
    </div>
  );
}
