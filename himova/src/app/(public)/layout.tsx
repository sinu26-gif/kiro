import Link from "next/link";

import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo } from "@/components/shared/logo";

/**
 * Layout for public, unauthenticated routes (landing, login, public leaderboard).
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" aria-label="Himova home" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo size="md" />
          </Link>
          <LanguageToggle />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-card/30">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-xs">·</span>
            <span className="text-xs">Made for Nepal</span>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} Himova. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
