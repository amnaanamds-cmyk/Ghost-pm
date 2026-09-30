import { redirect } from "next/navigation";
import Link from "next/link";
import { Ghost } from "lucide-react";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { listMyWorkspaces, requireWorkspace } from "@/lib/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/");
  const { userId, workspace } = await requireWorkspace();
  const workspaces = (await listMyWorkspaces(userId)).map((m) => m.workspace);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-1">
            <Link href="/dashboard" aria-label="Ghost PM home" className="mr-1 flex items-center gap-2 font-semibold">
              <Ghost className="size-5" />
              <span className="hidden sm:inline">Ghost PM</span>
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <WorkspaceSwitcher
              current={{ id: workspace.id, name: workspace.name, personal: workspace.personal, plan: workspace.plan }}
              workspaces={workspaces}
            />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu name={session.user.name} image={session.user.image} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
