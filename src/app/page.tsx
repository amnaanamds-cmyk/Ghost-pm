import Link from "next/link";
import { ArrowRight, CalendarRange, Check, Inbox, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { SignInButton } from "@/components/sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FREE_TASK_LIMIT } from "@/lib/limits";
import { PRO_PRICE_PER_SEAT } from "@/lib/billing";

const features = [
  {
    icon: Inbox,
    title: "Dump anything",
    body: "Type it, say it, or paste a screenshot. Bugs, ideas, user feedback, 2am rants — Ghost PM splits the mess into clean, prioritized tasks.",
  },
  {
    icon: Sparkles,
    title: "Agent-ready prompts",
    body: "One click turns a task into a detailed prompt for Claude Code or Cursor: goal, context, likely files, steps, acceptance criteria and what not to touch.",
  },
  {
    icon: CalendarRange,
    title: "Plan your week",
    body: "Ghost PM reads your backlog and picks the 5 things worth building this week — and tells you what to ignore. Push tasks to GitHub issues when you're ready.",
  },
];

export default async function Home() {
  const session = await auth();
  const signedIn = !!session?.user;

  const cta = signedIn ? (
    <Button asChild size="lg">
      <Link href="/dashboard">
        Open dashboard <ArrowRight />
      </Link>
    </Button>
  ) : (
    <SignInButton size="lg" label="Start free with GitHub" />
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {signedIn ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <SignInButton size="sm" label="Sign in" />
          )}
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pt-16 pb-20 text-center sm:pt-24">
          <p className="text-muted-foreground mb-4 inline-flex rounded-full border px-3 py-1 text-xs">
            For vibe coders shipping with Claude Code & Cursor
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            The product manager for your AI coding agents
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg text-balance">
            Your agents can write the code. Ghost PM decides what they should build next — and writes the prompt.
          </p>
          <div className="mt-8 flex justify-center">{cta}</div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-24 md:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="gap-3 p-6">
              <f.icon className="size-6" />
              <h2 className="text-lg font-semibold">{f.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.body}</p>
            </Card>
          ))}
        </section>

        <section id="pricing" className="bg-muted/40 border-y py-20">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Simple pricing</h2>
            <p className="text-muted-foreground mt-2 text-center">Start free. Upgrade when Ghost PM is running your roadmap.</p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <PlanCard
                name="Free"
                price="$0"
                features={[`${FREE_TASK_LIMIT} AI tasks / month`, "Unlimited projects & teammates", "Agent prompt generator", "Weekly roadmap", "GitHub issue sync"]}
                action={cta}
              />
              <PlanCard
                name="Pro"
                price={`$${PRO_PRICE_PER_SEAT}`}
                unit="/seat/mo"
                highlight
                features={["Unlimited AI tasks", "Everything in Free", "Team workspaces & roles", "Priority support"]}
                action={
                  signedIn ? (
                    <Button asChild size="lg">
                      <Link href="/settings/billing">Upgrade to Pro</Link>
                    </Button>
                  ) : (
                    <SignInButton size="lg" label="Start free, upgrade anytime" />
                  )
                }
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-8 text-xs">
        <span>© {new Date().getFullYear()} Ghost PM</span>
        <span>Built for people who ship.</span>
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  unit = "/mo",
  features,
  action,
  highlight,
}: {
  name: string;
  price: string;
  unit?: string;
  features: string[];
  action: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-foreground/40 gap-5 p-6 shadow-md" : "gap-5 p-6"}>
      <div>
        <h3 className="font-semibold">{name}</h3>
        <p className="mt-2">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-muted-foreground">{unit}</span>
        </p>
      </div>
      <ul className="flex-1 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check className="size-4 shrink-0" /> {f}
          </li>
        ))}
      </ul>
      <div className="[&_button]:w-full [&_a]:w-full [&_form]:w-full">{action}</div>
    </Card>
  );
}
