import { requireUserId } from "@/lib/session";

export default async function DashboardPage() {
  await requireUserId();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
      <p className="text-muted-foreground">Projects are coming in phase 2.</p>
    </div>
  );
}
