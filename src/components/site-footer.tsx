import Link from "next/link";
import { legal } from "@/lib/legal";

export function SiteFooter() {
  return (
    <footer className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-xs">
      <span>© {new Date().getFullYear()} {legal.company}</span>
      <nav className="flex gap-4">
        <Link href="/#pricing" className="hover:text-foreground">Pricing</Link>
        <Link href="/terms" className="hover:text-foreground">Terms</Link>
        <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
        <a href={`mailto:${legal.contact}`} className="hover:text-foreground">Contact</a>
      </nav>
    </footer>
  );
}
