import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { effectivePlan, PRO_PRICE_PER_SEAT } from "@/lib/billing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminWorkspaceActions } from "@/components/admin/workspace-actions";
import { integrations } from "@/lib/config";

export const metadata = { title: "Admin — Ghost PM" };

export default async function AdminPage() {
  await requireAdmin();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [users, newUsers, workspaces, tasks30, captures30, recentUsers, allWorkspaces, failedHooks] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.workspace.count(),
    db.task.count({ where: { createdAt: { gte: since } } }),
    db.capture.count({ where: { createdAt: { gte: since } } }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, email: true, githubLogin: true, createdAt: true },
    }),
    db.workspace.findMany({
      orderBy: [{ plan: "desc" }, { updatedAt: "desc" }],
      take: 50,
      select: {
        id: true,
        name: true,
        personal: true,
        plan: true,
        seats: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        tasksThisPeriod: true,
        lsSubscriptionId: true,
        _count: { select: { members: true, projects: true } },
      },
    }),
    db.webhookEvent.findMany({ where: { error: { not: null } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const paying = allWorkspaces.filter((w) => effectivePlan(w) === "PRO" && w.lsSubscriptionId && w.subscriptionStatus === "active");
  const mrr = paying.reduce((sum, w) => sum + w.seats * PRO_PRICE_PER_SEAT, 0);

  const stats = [
    { label: "Users", value: users, sub: `+${newUsers} in 30d` },
    { label: "Workspaces", value: workspaces },
    { label: "Paying workspaces", value: paying.length },
    { label: "MRR (est.)", value: `$${mrr.toLocaleString()}` },
    { label: "Tasks (30d)", value: tasks30 },
    { label: "Captures (30d)", value: captures30 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="gap-1 p-4">
            <p className="text-muted-foreground text-xs">{s.label}</p>
            <p className="text-2xl font-semibold tabular-nums" data-stat={s.label}>
              {s.value}
            </p>
            {s.sub && <p className="text-muted-foreground text-xs">{s.sub}</p>}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System status</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {integrations().map((i) => (
              <li key={i.id} className="flex items-start gap-2" data-integration={i.id} data-enabled={i.enabled}>
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${i.enabled ? "bg-green-500" : i.required ? "bg-red-500" : "bg-muted-foreground/40"}`}
                />
                <span className="min-w-0">
                  <span className="font-medium">{i.name}</span>{" "}
                  <span className="text-muted-foreground">
                    {i.enabled ? `— ${i.note}` : `— ${i.required ? "required, " : ""}missing ${i.missing.join(", ")}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="py-2 font-medium">Name</th>
                <th className="font-medium">Plan</th>
                <th className="font-medium">Subscription</th>
                <th className="font-medium">Members</th>
                <th className="font-medium">Projects</th>
                <th className="font-medium">Tasks this month</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {allWorkspaces.map((w) => (
                <tr key={w.id} data-admin-ws={w.name}>
                  <td className="py-2">
                    {w.name} {w.personal && <span className="text-muted-foreground text-xs">(personal)</span>}
                  </td>
                  <td>
                    <Badge variant={effectivePlan(w) === "PRO" ? "default" : "secondary"}>{effectivePlan(w)}</Badge>
                  </td>
                  <td className="text-muted-foreground text-xs">
                    {w.subscriptionStatus ? `${w.subscriptionStatus} · ${w.seats} seat(s)` : w.plan === "PRO" ? "comped" : "—"}
                  </td>
                  <td>{w._count.members}</td>
                  <td>{w._count.projects}</td>
                  <td className="tabular-nums">{w.tasksThisPeriod}</td>
                  <td className="text-right">
                    <AdminWorkspaceActions id={w.id} plan={w.plan} managedByBilling={!!w.lsSubscriptionId && w.subscriptionStatus !== "expired"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Newest users</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {recentUsers.map((u) => (
                <li key={u.id} className="flex justify-between gap-2 py-2">
                  <span className="truncate">
                    {u.name} <span className="text-muted-foreground">{u.githubLogin ? `@${u.githubLogin}` : u.email}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">{u.createdAt.toISOString().slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Failed billing webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            {failedHooks.length === 0 ? (
              <p className="text-muted-foreground text-sm">None 🎉</p>
            ) : (
              <ul className="divide-y text-sm">
                {failedHooks.map((h) => (
                  <li key={h.id} className="py-2">
                    <p className="font-medium">
                      {h.eventName} <span className="text-muted-foreground text-xs">{h.createdAt.toISOString()}</span>
                    </p>
                    <p className="text-destructive truncate text-xs">{h.error}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
