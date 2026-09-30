import Link from "next/link";
import { Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Ghost className="text-muted-foreground size-12" />
      <h1 className="text-xl font-semibold">Nothing here</h1>
      <p className="text-muted-foreground text-sm">This page vanished — or never existed.</p>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </main>
  );
}
