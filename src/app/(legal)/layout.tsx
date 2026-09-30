import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteFooter } from "@/components/site-footer";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <article className="space-y-4 text-sm leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:pt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_a]:underline">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
