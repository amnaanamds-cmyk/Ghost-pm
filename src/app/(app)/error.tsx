"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <TriangleAlert className="text-destructive size-10" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">The page failed to load. It&apos;s probably temporary.</p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
