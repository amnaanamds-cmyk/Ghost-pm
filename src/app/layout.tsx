import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ghost PM — the product manager for your AI coding agents",
  description:
    "Dump messy ideas, bugs and screenshots. Ghost PM turns them into prioritized tasks and ready-to-paste prompts for Claude Code and Cursor.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
