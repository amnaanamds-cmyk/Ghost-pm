"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/settings/workspace", label: "Workspace" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap",
            pathname === l.href
              ? "border-foreground font-medium"
              : "text-muted-foreground hover:text-foreground border-transparent"
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
