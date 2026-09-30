"use client";

import { useTransition } from "react";
import { CreditCard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { openBillingPortal, startCheckout } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";

export function BillingActions({
  enabled,
  isOwner,
  hasSubscription,
  seats,
  price,
}: {
  enabled: boolean;
  isOwner: boolean;
  hasSubscription: boolean;
  seats: number;
  price: number;
}) {
  const [pending, startTransition] = useTransition();

  if (!enabled) {
    return <p className="text-muted-foreground text-sm">Online billing isn&apos;t enabled on this server yet.</p>;
  }
  if (!isOwner) {
    return <p className="text-muted-foreground text-sm">Only workspace owners can manage billing.</p>;
  }

  const go = (fn: typeof startCheckout) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      window.location.href = res.data.url;
    });

  return hasSubscription ? (
    <Button variant="outline" onClick={() => go(openBillingPortal)} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <CreditCard />} Manage billing
    </Button>
  ) : (
    <Button onClick={() => go(startCheckout)} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
      Upgrade to Pro — ${price * seats}/mo for {seats} seat{seats === 1 ? "" : "s"}
    </Button>
  );
}
