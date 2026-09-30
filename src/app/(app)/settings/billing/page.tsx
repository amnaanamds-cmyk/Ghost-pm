import { Check } from "lucide-react";
import { requireWorkspace } from "@/lib/workspace";
import { billingEnabled, effectivePlan, PRO_PRICE_PER_SEAT, seatCount } from "@/lib/billing";
import { getUsage } from "@/lib/limits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageMeter } from "@/components/usage-meter";
import { BillingActions } from "@/components/settings/billing-actions";

const STATUS_LABEL: Record<string, string> = {
  on_trial: "Trial",
  active: "Active",
  past_due: "Payment failed — retrying",
  paused: "Paused",
  unpaid: "Unpaid",
  cancelled: "Cancelled — active until period end",
  expired: "Expired",
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const { workspace, membership } = await requireWorkspace();
  const [usage, members] = await Promise.all([getUsage(workspace.id), seatCount(workspace.id)]);
  const plan = effectivePlan(workspace);
  const isOwner = membership.role === "OWNER";
  const periodEnd = workspace.currentPeriodEnd?.toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" });

  return (
    <div className="grid gap-6">
      {checkout === "success" && plan !== "PRO" && (
        <Card className="border-primary/40 p-4 text-sm">
          Payment received — activating Pro. This usually takes a few seconds; refresh if it doesn&apos;t update.
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current plan <Badge variant={plan === "PRO" ? "default" : "secondary"}>{plan === "PRO" ? "Pro" : "Free"}</Badge>
          </CardTitle>
          <CardDescription>
            {plan === "PRO"
              ? `${workspace.seats} seat${workspace.seats === 1 ? "" : "s"} × $${PRO_PRICE_PER_SEAT}/month. Seats follow your member count automatically.`
              : `Free includes ${usage.limit} AI-created tasks per month for the whole workspace.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageMeter usage={usage} />
          {workspace.subscriptionStatus && (
            <dl className="grid gap-1 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Status</dt>
              <dd data-billing-status>{STATUS_LABEL[workspace.subscriptionStatus] ?? workspace.subscriptionStatus}</dd>
              {periodEnd && (
                <>
                  <dt className="text-muted-foreground">
                    {workspace.subscriptionStatus === "cancelled" || workspace.subscriptionStatus === "expired"
                      ? "Ends"
                      : "Renews"}
                  </dt>
                  <dd>{periodEnd}</dd>
                </>
              )}
            </dl>
          )}
          {workspace.subscriptionStatus === "past_due" && (
            <p className="text-destructive text-sm">
              Your last payment failed. Update your card in the billing portal to keep Pro.
            </p>
          )}
          <BillingActions
            enabled={billingEnabled()}
            isOwner={isOwner}
            hasSubscription={Boolean(workspace.lsSubscriptionId) && workspace.subscriptionStatus !== "expired"}
            seats={members}
            price={PRO_PRICE_PER_SEAT}
          />
        </CardContent>
      </Card>

      {plan !== "PRO" && (
        <Card>
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>${PRO_PRICE_PER_SEAT} per seat / month</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {["Unlimited AI tasks", "Unlimited teammates", "Priority support", "Early access to new features"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="size-4" /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
